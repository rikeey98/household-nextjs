import type ExcelJS from "exceljs";

export function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString();

  const record = value as unknown as Record<string, unknown>;

  if (typeof record.text === "string") return record.text.trim();
  if ("result" in record) return cellText(record.result as ExcelJS.CellValue);
  if (Array.isArray(record.richText)) {
    return record.richText
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("")
      .trim();
  }

  return String(value).trim();
}

export function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "");
}

export function rowHasValues(row: ExcelJS.Row) {
  for (let col = 1; col <= row.cellCount; col += 1) {
    if (cellText(row.getCell(col).value)) return true;
  }

  return false;
}

export function buildHeaderMap(row: ExcelJS.Row) {
  const headerMap = new Map<string, number>();

  for (let col = 1; col <= row.cellCount; col += 1) {
    const header = normalizeHeader(cellText(row.getCell(col).value));
    if (header) headerMap.set(header, col);
  }

  return headerMap;
}

export function valueByHeader(
  row: ExcelJS.Row,
  headerMap: Map<string, number>,
  header: string,
) {
  const column = headerMap.get(normalizeHeader(header));
  if (!column) return "";
  return cellText(row.getCell(column).value);
}

export function numberByHeader(
  row: ExcelJS.Row,
  headerMap: Map<string, number>,
  header: string,
) {
  const column = headerMap.get(normalizeHeader(header));
  if (!column) return null;

  const value = row.getCell(column).value;
  if (typeof value === "number") return value;

  const normalized = cellText(value).replace(/[^\d.-]/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toIsoDate(value: string) {
  const normalized = value.trim();
  const dotted = normalized.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  const compact = normalized.match(/^(\d{4})(\d{2})(\d{2})$/);
  const match = dotted ?? compact;

  if (!match) return null;

  const [, year, month, day] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00`);
  const isValid =
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day);

  return Number.isNaN(date.getTime()) || !isValid ? null : iso;
}

export function toIsoTime(value: string) {
  const normalized = value.trim();
  const colon = normalized.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  const compact = normalized.match(/^(\d{2})(\d{2})(\d{2})?$/);
  const match = colon ?? compact;

  if (!match) return null;

  const [, hour, minute, second = "00"] = match;
  const h = Number(hour);
  const m = Number(minute);
  const s = Number(second);

  if (h > 23 || m > 59 || s > 59) return null;

  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`;
}

export function cardLast4(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}
