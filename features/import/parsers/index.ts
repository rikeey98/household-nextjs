import type ExcelJS from "exceljs";
import type { CardExcelParser } from "./types";
import { samsungCardParser } from "./samsung";

const parsers: CardExcelParser[] = [samsungCardParser];

export function detectCardExcelParser(workbook: ExcelJS.Workbook) {
  return parsers.find((parser) => parser.detect(workbook)) ?? null;
}

export { parsers };
