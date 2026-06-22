import { createHash } from "crypto";
import { parse, type HTMLElement } from "node-html-parser";
import type { ImportPreviewRow } from "@/features/import/types";
import type { CardHtmlParser, ParserContext } from "./types";
import { cardLast4, toIsoDate } from "./utils";

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

const DATE_PATTERN = /^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/;

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
