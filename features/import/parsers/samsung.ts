import { createHash } from "crypto";
import type ExcelJS from "exceljs";
import type { ImportPreviewRow } from "@/features/import/types";
import type { CardExcelParser, ParserContext } from "./types";
import {
  buildHeaderMap,
  cardLast4,
  numberByHeader,
  rowHasValues,
  toIsoDate,
  toIsoTime,
  valueByHeader,
} from "./utils";

const REQUIRED_HEADERS = [
  "승인일자",
  "승인시각",
  "가맹점명",
  "승인금액(원)",
  "승인번호",
  "취소여부",
];

type SamsungSheet = {
  worksheet: ExcelJS.Worksheet;
  headerRowNumber: number;
  headerMap: Map<string, number>;
};

export const samsungCardParser: CardExcelParser = {
  provider: "samsung",
  label: "삼성카드",
  detect(workbook) {
    return findSamsungSheet(workbook) !== null;
  },
  parse(workbook, context) {
    const sheet = findSamsungSheet(workbook);
    if (!sheet) return [];

    const rows: ImportPreviewRow[] = [];

    for (
      let rowNumber = sheet.headerRowNumber + 1;
      rowNumber <= sheet.worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = sheet.worksheet.getRow(rowNumber);
      if (!rowHasValues(row)) continue;

      rows.push(parseSamsungRow(row, sheet, context));
    }

    return rows;
  },
};

function findSamsungSheet(workbook: ExcelJS.Workbook): SamsungSheet | null {
  for (const worksheet of workbook.worksheets) {
    const maxHeaderRow = Math.min(worksheet.rowCount, 20);

    for (let rowNumber = 1; rowNumber <= maxHeaderRow; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const headerMap = buildHeaderMap(row);

      if (REQUIRED_HEADERS.every((header) => headerMap.has(header))) {
        return { worksheet, headerRowNumber: rowNumber, headerMap };
      }
    }
  }

  return null;
}

function parseSamsungRow(
  row: ExcelJS.Row,
  sheet: SamsungSheet,
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
  const amount = parseAmount(row, sheet.headerMap);
  const date = toIsoDate(approvedDateRaw);
  const time = toIsoTime(approvedTimeRaw);
  const paymentDueDate = paymentDueDateRaw
    ? toIsoDate(paymentDueDateRaw)
    : null;
  const occurredAt = date && time ? `${date}T${time}` : date;
  const installmentMonths = parseInstallmentMonths(row, sheet.headerMap);
  const importFingerprint = fingerprint([
    "samsung",
    approvalNumber ?? "",
    approvedDateRaw,
    approvedTimeRaw,
    String(amount ?? ""),
    description,
  ]);
  const baseRow: ImportPreviewRow = {
    rowKey: `${context.sourceFileId}:${row.number}`,
    provider: "samsung",
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

function parseAmount(row: ExcelJS.Row, headerMap: Map<string, number>) {
  const amount = numberByHeader(row, headerMap, "승인금액(원)");
  if (!amount || amount <= 0) return null;
  return Math.round(amount);
}

function parseInstallmentMonths(
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

function fingerprint(parts: string[]) {
  return createHash("sha256")
    .update(parts.map((part) => part.trim()).join("|"))
    .digest("hex");
}
