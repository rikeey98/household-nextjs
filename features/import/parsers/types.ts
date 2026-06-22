import type ExcelJS from "exceljs";
import type {
  ImportPreviewRow,
  ImportProvider,
} from "@/features/import/types";

export type ParserContext = {
  fileName: string;
  sourceFileId: string;
};

export type CardExcelParser = {
  provider: ImportProvider;
  label: string;
  detect: (workbook: ExcelJS.Workbook) => boolean;
  parse: (
    workbook: ExcelJS.Workbook,
    context: ParserContext,
  ) => ImportPreviewRow[];
};

export type CardHtmlParser = {
  provider: ImportProvider;
  label: string;
  detect: (html: string) => boolean;
  parse: (html: string, context: ParserContext) => ImportPreviewRow[];
};
