import type ExcelJS from "exceljs";
import type { CardExcelParser, CardHtmlParser } from "./types";
import { samsungCardParser } from "./samsung";
import { shinhanCardExcelParser, shinhanCardHtmlParser } from "./shinhan";

const parsers: CardExcelParser[] = [shinhanCardExcelParser, samsungCardParser];
const htmlParsers: CardHtmlParser[] = [shinhanCardHtmlParser];

export function detectCardExcelParser(workbook: ExcelJS.Workbook) {
  return parsers.find((parser) => parser.detect(workbook)) ?? null;
}

export function detectCardHtmlParser(html: string) {
  return htmlParsers.find((parser) => parser.detect(html)) ?? null;
}

export { htmlParsers, parsers };
