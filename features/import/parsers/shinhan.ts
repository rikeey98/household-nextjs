import { createHash } from "crypto";
import type ExcelJS from "exceljs";
import { parse, type HTMLElement } from "node-html-parser";
import type { ImportPreviewRow } from "@/features/import/types";
import type { CardExcelParser, CardHtmlParser, ParserContext } from "./types";
import {
  buildHeaderMap,
  cardLast4,
  numberByHeader,
  rowHasValues,
  toIsoDate,
  toIsoTime,
  valueByHeader,
} from "./utils";

const SHINHAN_EXCEL_REQUIRED_HEADERS = [
  "카드번호",
  "본인가족구분",
  "승인일자",
  "승인시각",
  "가맹점명",
  "승인금액(원)",
  "승인번호",
  "취소여부",
  "결제일",
];

type TableRow = {
  row: string[];
  rowIndex: number;
};

type ShinhanUsageTable = {
  rows: string[][];
  dateRows: TableRow[];
};

type PaymentDueDate = {
  iso: string | null;
  raw: string | null;
};

type ShinhanExcelSheet = {
  worksheet: ExcelJS.Worksheet;
  headerRowNumber: number;
  headerMap: Map<string, number>;
};

const DATE_PATTERN = /^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/;

export const shinhanCardExcelParser: CardExcelParser = {
  provider: "shinhan",
  label: "신한카드",
  detect(workbook) {
    return findShinhanExcelSheet(workbook) !== null;
  },
  parse(workbook, context) {
    const sheet = findShinhanExcelSheet(workbook);
    if (!sheet) return [];

    const rows: ImportPreviewRow[] = [];

    for (
      let rowNumber = sheet.headerRowNumber + 1;
      rowNumber <= sheet.worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.worksheet.getRow(rowNumber);
      if (!rowHasValues(row)) continue;

      rows.push(parseShinhanExcelRow(row, sheet, context));
    }

    return rows;
  },
};

export const shinhanCardHtmlParser: CardHtmlParser = {
  provider: "shinhan",
  label: "신한카드",
  detect(html) {
    const text = normalizeCell(html);
    return (
      text.includes("신한") &&
      text.includes("이용대금명세서") &&
      text.includes("이용가맹점") &&
      text.includes("이번달 납부금액")
    );
  },
  parse(html, context) {
    const root = parse(html);
    const usageTable = findUsageTable(root);
    if (!usageTable) return [];

    const paymentDueDate = extractPaymentDueDate(root);

    return usageTable.dateRows.map(({ row, rowIndex }) =>
      parseShinhanRow(row, rowIndex, context, paymentDueDate),
    );
  },
};

function findShinhanExcelSheet(
  workbook: ExcelJS.Workbook,
): ShinhanExcelSheet | null {
  const summarySheet = workbook.getWorksheet("■ 카드이용내역");
  const hasShinhanSummary =
    summarySheet &&
    buildHeaderMap(summarySheet.getRow(1)).has("조회기간") &&
    buildHeaderMap(summarySheet.getRow(1)).has("이용지역") &&
    buildHeaderMap(summarySheet.getRow(1)).has("이용구분");

  if (!hasShinhanSummary) return null;

  for (const worksheet of workbook.worksheets) {
    const maxHeaderRow = Math.min(worksheet.rowCount, 20);

    for (let rowNumber = 1; rowNumber <= maxHeaderRow; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const headerMap = buildHeaderMap(row);

      if (
        SHINHAN_EXCEL_REQUIRED_HEADERS.every((header) => headerMap.has(header))
      ) {
        return { worksheet, headerRowNumber: rowNumber, headerMap };
      }
    }
  }

  return null;
}

function parseShinhanExcelRow(
  row: ExcelJS.Row,
  sheet: ShinhanExcelSheet,
  context: ParserContext,
): ImportPreviewRow {
  const approvedDateRaw = valueByHeader(row, sheet.headerMap, "승인일자");
  const approvedTimeRaw = valueByHeader(row, sheet.headerMap, "승인시각");
  const description = valueByHeader(row, sheet.headerMap, "가맹점명");
  const approvalNumber =
    valueByHeader(row, sheet.headerMap, "승인번호") || null;
  const cancelStatus = valueByHeader(row, sheet.headerMap, "취소여부");
  const paymentDueDateRaw = valueByHeader(row, sheet.headerMap, "결제일");
  const installmentType = valueByHeader(
    row,
    sheet.headerMap,
    "일시불할부구분",
  );
  const cardNumber = valueByHeader(row, sheet.headerMap, "카드번호");
  const cardOwnerType = valueByHeader(row, sheet.headerMap, "본인가족구분");
  const amount = parseExcelAmount(row, sheet.headerMap);
  const date = toIsoDate(approvedDateRaw);
  const time = toIsoTime(approvedTimeRaw);
  const paymentDueDate = paymentDueDateRaw
    ? toIsoDate(paymentDueDateRaw)
    : null;
  const occurredAt = date && time ? `${date}T${time}` : date;
  const installmentMonths = parseExcelInstallmentMonths(row, sheet.headerMap);
  const importFingerprint = fingerprint([
    "shinhan",
    approvalNumber ?? "",
    approvedDateRaw,
    approvedTimeRaw,
    String(amount ?? ""),
    description,
  ]);
  const baseRow: ImportPreviewRow = {
    rowKey: `${context.sourceFileId}:${row.number}`,
    provider: "shinhan",
    sourceFileId: context.sourceFileId,
    sourceRowIndex: row.number - 1,
    excelRowNumber: row.number,
    date,
    occurredAt,
    paymentDueDate,
    amount,
    transactionType: "expense",
    categoryId: null,
    description,
    paymentMethod: "card",
    installmentMonths,
    originalCurrency: "KRW",
    originalAmount: amount,
    approvalNumber,
    importFingerprint,
    sourceMetadata: {
      sheetName: sheet.worksheet.name,
      cardLast4: cardLast4(cardNumber),
      cardOwnerType: cardOwnerType || null,
      installmentType: installmentType || null,
      cancelStatus: cancelStatus || null,
      paymentDueDateRaw: paymentDueDateRaw || null,
    },
    status: "ready",
    statusReason: null,
  };

  if (isCanceled(cancelStatus)) {
    return {
      ...baseRow,
      status: "skipped",
      statusReason: "취소 거래",
    };
  }

  const missingFields = [
    !date && "승인일자",
    !time && "승인시각",
    !description && "가맹점명",
    !amount && "승인금액",
  ].filter(Boolean);

  if (missingFields.length > 0) {
    return {
      ...baseRow,
      status: "error",
      statusReason: `${missingFields.join(", ")} 확인 필요`,
    };
  }

  return baseRow;
}

function findUsageTable(root: HTMLElement): ShinhanUsageTable | null {
  const candidates = root
    .querySelectorAll("table")
    .map((table) => {
      const rows = tableRows(table);
      const hasUsageHeader = rows.some(
        (row) =>
          row.includes("이용일") &&
          row.includes("이용카드") &&
          row.includes("이용가맹점") &&
          row.includes("이용금액"),
      );
      const dateRows = rows
        .map((row, rowIndex) => ({ row, rowIndex }))
        .filter(({ row }) => DATE_PATTERN.test(row[0] ?? ""));

      if (!hasUsageHeader || dateRows.length === 0) return null;
      return { rows, dateRows };
    })
    .filter((candidate): candidate is ShinhanUsageTable => candidate !== null);

  candidates.sort(
    (a, b) => b.dateRows.length - a.dateRows.length || a.rows.length - b.rows.length,
  );

  return candidates[0] ?? null;
}

function parseShinhanRow(
  row: string[],
  rowIndex: number,
  context: ParserContext,
  paymentDueDate: PaymentDueDate,
): ImportPreviewRow {
  const dateRaw = row[0] ?? "";
  const cardLabel = row[1] ?? "";
  const description = (row[2] ?? "").slice(0, 200);
  const rawUseAmount = parseMoney(row[3] ?? "");
  const installmentMonths = parseInstallmentMonths(row[4] ?? "");
  const installmentRound = row[5] || null;
  const billingPrincipal = parseMoney(row[6] ?? "");
  const billingFee = parseMoney(row[7] ?? "") ?? 0;
  const amount =
    billingPrincipal && billingPrincipal > 0
      ? Math.round(billingPrincipal + billingFee)
      : rawUseAmount
        ? Math.round(rawUseAmount)
        : null;
  const date = toIsoDate(dateRaw);
  const occurredAt = date ? `${date}T00:00:00` : null;
  const importFingerprint = fingerprint([
    "shinhan",
    dateRaw,
    cardLabel,
    description,
    String(amount ?? ""),
    String(billingPrincipal ?? ""),
    String(billingFee ?? ""),
  ]);
  const baseRow: ImportPreviewRow = {
    rowKey: `${context.sourceFileId}:shinhan:${rowIndex}`,
    provider: "shinhan",
    sourceFileId: context.sourceFileId,
    sourceRowIndex: rowIndex,
    excelRowNumber: rowIndex + 1,
    date,
    occurredAt,
    paymentDueDate: paymentDueDate.iso,
    amount,
    transactionType: "expense",
    categoryId: null,
    description,
    paymentMethod: "card",
    installmentMonths,
    originalCurrency: "KRW",
    originalAmount: amount,
    approvalNumber: null,
    importFingerprint,
    sourceMetadata: {
      sheetName: "HTML",
      cardLast4: cardLast4(cardLabel),
      cardOwnerType: cardLabel || null,
      installmentType:
        installmentMonths > 0 ? `${installmentMonths}개월` : null,
      cancelStatus: null,
      paymentDueDateRaw: paymentDueDate.raw,
      cardLabel: cardLabel || null,
      rawUseAmount,
      billingPrincipal,
      billingFee,
      installmentRound,
    },
    status: "ready",
    statusReason: null,
  };

  const missingFields = [
    !date && "이용일",
    !description && "이용가맹점",
    !amount && "납부금액",
  ].filter(Boolean);

  if (missingFields.length > 0) {
    return {
      ...baseRow,
      status: "error",
      statusReason: `${missingFields.join(", ")} 확인 필요`,
    };
  }

  return baseRow;
}

function extractPaymentDueDate(root: HTMLElement): PaymentDueDate {
  for (const table of root.querySelectorAll("table")) {
    const rows = tableRows(table);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const headerColumn = rows[rowIndex].findIndex(
        (cell) => normalizeHeader(cell) === "결제일",
      );
      if (headerColumn < 0) continue;

      for (
        let nextRowIndex = rowIndex + 1;
        nextRowIndex < Math.min(rows.length, rowIndex + 4);
        nextRowIndex += 1
      ) {
        const raw = rows[nextRowIndex][headerColumn] ?? "";
        const iso = toIsoDate(raw);
        if (iso) return { iso, raw };
      }
    }
  }

  return { iso: null, raw: null };
}

function tableRows(table: HTMLElement) {
  return table
    .querySelectorAll("tr")
    .map((row) =>
      row.querySelectorAll("th,td").map((cell) => normalizeCell(cell.text)),
    )
    .filter((row) => row.some(Boolean));
}

function parseInstallmentMonths(value: string) {
  const parsed = parseMoney(value);
  if (parsed && parsed > 0) return Math.round(parsed);

  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseMoney(value: string) {
  const normalized = value.replace(/[^\d.-]/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseExcelAmount(row: ExcelJS.Row, headerMap: Map<string, number>) {
  const amount = numberByHeader(row, headerMap, "승인금액(원)");
  if (!amount || amount <= 0) return null;
  return Math.round(amount);
}

function parseExcelInstallmentMonths(
  row: ExcelJS.Row,
  headerMap: Map<string, number>,
) {
  const months = numberByHeader(row, headerMap, "할부개월");
  if (months && months > 0) return Math.round(months);
  return 0;
}

function isCanceled(value: string) {
  const normalized = value.trim();
  return normalized !== "" && normalized !== "-";
}

function normalizeCell(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "");
}

function fingerprint(parts: string[]) {
  return createHash("sha256")
    .update(parts.map((part) => part.trim()).join("|"))
    .digest("hex");
}
