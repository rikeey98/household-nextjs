import type { CategoryType } from "@/features/categories/types";
import type { PaymentMethod } from "@/features/transactions/types";

export type ImportProvider = "samsung";

export type ImportRowStatus = "ready" | "duplicate" | "skipped" | "error";

export type ImportSourceMetadata = {
  sheetName: string;
  cardLast4: string | null;
  cardOwnerType: string | null;
  installmentType: string | null;
  cancelStatus: string | null;
  paymentDueDateRaw: string | null;
};

export type ImportPreviewRow = {
  rowKey: string;
  provider: ImportProvider;
  sourceFileId: string;
  sourceRowIndex: number;
  excelRowNumber: number;
  date: string | null;
  occurredAt: string | null;
  paymentDueDate: string | null;
  amount: number | null;
  transactionType: CategoryType;
  categoryId: number | null;
  description: string;
  paymentMethod: PaymentMethod;
  installmentMonths: number;
  originalCurrency: "KRW";
  originalAmount: number | null;
  approvalNumber: string | null;
  importFingerprint: string;
  sourceMetadata: ImportSourceMetadata;
  status: ImportRowStatus;
  statusReason: string | null;
};

export type ImportSummary = {
  totalRows: number;
  readyRows: number;
  duplicateRows: number;
  skippedRows: number;
  errorRows: number;
  readyAmount: number;
};

export type ImportActionState = {
  ok: boolean;
  message: string | null;
  provider: ImportProvider | null;
  providerLabel: string | null;
  fileName: string | null;
  sourceFileId: string | null;
  rows: ImportPreviewRow[];
  summary: ImportSummary;
  savedCount: number;
};

export const emptyImportSummary: ImportSummary = {
  totalRows: 0,
  readyRows: 0,
  duplicateRows: 0,
  skippedRows: 0,
  errorRows: 0,
  readyAmount: 0,
};

export const initialImportState: ImportActionState = {
  ok: false,
  message: null,
  provider: null,
  providerLabel: null,
  fileName: null,
  sourceFileId: null,
  rows: [],
  summary: emptyImportSummary,
  savedCount: 0,
};
