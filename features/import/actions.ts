"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/auth";
import {
  emptyImportSummary,
  type ImportActionState,
  type ImportPreviewRow,
  initialImportState,
} from "@/features/import/types";
import { detectCardExcelParser } from "@/features/import/parsers";

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

const importSourceMetadataSchema = z
  .object({
    sheetName: z.string(),
    cardLast4: z.string().nullable(),
    cardOwnerType: z.string().nullable(),
    installmentType: z.string().nullable(),
    cancelStatus: z.string().nullable(),
    paymentDueDateRaw: z.string().nullable(),
  })
  .passthrough();

const importRowSchema = z.object({
  rowKey: z.string(),
  provider: z.literal("samsung"),
  sourceFileId: z.string().uuid(),
  sourceRowIndex: z.number().int().min(0),
  excelRowNumber: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  occurredAt: z.string().nullable(),
  paymentDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  amount: z.number().int().positive().nullable(),
  transactionType: z.literal("expense"),
  categoryId: z.null(),
  description: z.string().trim().max(200),
  paymentMethod: z.literal("card"),
  installmentMonths: z.number().int().min(0),
  originalCurrency: z.literal("KRW"),
  originalAmount: z.number().positive().nullable(),
  approvalNumber: z.string().nullable(),
  importFingerprint: z.string().min(20),
  sourceMetadata: importSourceMetadataSchema,
  status: z.enum(["ready", "duplicate", "skipped", "error"]),
  statusReason: z.string().nullable(),
});

const savePayloadSchema = z.object({
  provider: z.literal("samsung"),
  sourceFileId: z.string().uuid(),
  rows: z.array(importRowSchema).max(2000),
});

export async function parseCardExcel(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return withMessage("엑셀 파일을 선택하세요.");
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return withMessage("10MB 이하 파일만 가져올 수 있습니다.");
  }

  const fileName = file.name;
  const sourceFileId = randomUUID();
  const { supabase, userId } = await getCurrentUserId();

  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await file.arrayBuffer());

    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );

    const parser = detectCardExcelParser(workbook);
    if (!parser) {
      return withMessage("지원하는 카드 이용내역 형식을 찾지 못했습니다.");
    }

    const parsedRows = parser.parse(workbook, { fileName, sourceFileId });
    const rows = await markDuplicateRows(parsedRows, supabase, userId);

    return {
      ok: true,
      message: `${rows.length.toLocaleString("ko-KR")}개 행을 확인했습니다.`,
      provider: parser.provider,
      providerLabel: parser.label,
      fileName,
      sourceFileId,
      rows,
      summary: summarize(rows),
      savedCount: 0,
    };
  } catch (error) {
    return withMessage(
      error instanceof Error
        ? `파일을 읽지 못했습니다. ${error.message}`
        : "파일을 읽지 못했습니다.",
    );
  }
}

export async function saveCardImport(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const rawPayload = formData.get("payload");

  if (typeof rawPayload !== "string") {
    return withMessage("저장할 가져오기 데이터가 없습니다.");
  }

  const parsedPayload = parsePayload(rawPayload);
  if (!parsedPayload.ok) return withMessage(parsedPayload.message);

  const { supabase, userId } = await getCurrentUserId();
  const readyRows = parsedPayload.payload.rows.filter(
    (row) =>
      row.status === "ready" &&
      row.date &&
      row.amount &&
      row.originalAmount &&
      row.description,
  );

  if (readyRows.length === 0) {
    return {
      ...stateFromPayload(parsedPayload.payload.rows),
      message: "저장할 새 거래가 없습니다.",
    };
  }

  const fingerprints = [...new Set(readyRows.map((row) => row.importFingerprint))];
  const existingFingerprints = await findExistingFingerprints(
    supabase,
    userId,
    fingerprints,
  );
  const rowsToInsert = readyRows.filter(
    (row) => !existingFingerprints.has(row.importFingerprint),
  );

  if (rowsToInsert.length === 0) {
    return {
      ...stateFromPayload(
        parsedPayload.payload.rows.map((row) =>
          row.status === "ready"
            ? {
                ...row,
                status: "duplicate" as const,
                statusReason: "이미 저장된 거래",
              }
            : row,
        ),
      ),
      message: "모든 준비 행이 이미 저장되어 있습니다.",
    };
  }

  const { error } = await supabase.from("transactions").insert(
    rowsToInsert.map((row) => ({
      user_id: userId,
      date: row.date,
      amount: row.amount,
      transaction_type: row.transactionType,
      category_id: row.categoryId,
      description: row.description,
      payment_method: row.paymentMethod,
      installment_months: row.installmentMonths,
      original_currency: row.originalCurrency,
      original_amount: row.originalAmount,
      source_type: "card_excel",
      source_provider: row.provider,
      source_file_id: row.sourceFileId,
      source_row_index: row.sourceRowIndex,
      import_fingerprint: row.importFingerprint,
      occurred_at: row.occurredAt,
      payment_due_date: row.paymentDueDate,
      source_metadata: row.sourceMetadata,
    })),
  );

  if (error) {
    return {
      ...stateFromPayload(parsedPayload.payload.rows),
      message: error.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/import");

  const insertedFingerprints = new Set(
    rowsToInsert.map((row) => row.importFingerprint),
  );
  const rows = parsedPayload.payload.rows.map((row) =>
    insertedFingerprints.has(row.importFingerprint)
      ? {
          ...row,
          status: "duplicate" as const,
          statusReason: "저장 완료",
        }
      : row,
  );

  return {
    ...stateFromPayload(rows),
    ok: true,
    message: `${rowsToInsert.length.toLocaleString("ko-KR")}개 거래를 저장했습니다.`,
    savedCount: rowsToInsert.length,
  };
}

async function markDuplicateRows(
  rows: ImportPreviewRow[],
  supabase: Awaited<ReturnType<typeof getCurrentUserId>>["supabase"],
  userId: string,
) {
  const seen = new Set<string>();
  const rowsWithFileDuplicates = rows.map((row) => {
    if (row.status !== "ready") return row;
    if (seen.has(row.importFingerprint)) {
      return {
        ...row,
        status: "duplicate" as const,
        statusReason: "파일 안 중복",
      };
    }

    seen.add(row.importFingerprint);
    return row;
  });
  const fingerprints = rowsWithFileDuplicates
    .filter((row) => row.status === "ready")
    .map((row) => row.importFingerprint);
  const existingFingerprints = await findExistingFingerprints(
    supabase,
    userId,
    fingerprints,
  );

  return rowsWithFileDuplicates.map((row) => {
    if (
      row.status === "ready" &&
      existingFingerprints.has(row.importFingerprint)
    ) {
      return {
        ...row,
        status: "duplicate" as const,
        statusReason: "이미 저장된 거래",
      };
    }

    return row;
  });
}

async function findExistingFingerprints(
  supabase: Awaited<ReturnType<typeof getCurrentUserId>>["supabase"],
  userId: string,
  fingerprints: string[],
) {
  const uniqueFingerprints = [...new Set(fingerprints)];
  if (uniqueFingerprints.length === 0) return new Set<string>();

  const { data } = await supabase
    .from("transactions")
    .select("import_fingerprint")
    .eq("user_id", userId)
    .in("import_fingerprint", uniqueFingerprints);

  return new Set(
    (data ?? [])
      .map((row) => row.import_fingerprint)
      .filter((value): value is string => typeof value === "string"),
  );
}

function summarize(rows: ImportPreviewRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.totalRows += 1;
      if (row.status === "ready") {
        summary.readyRows += 1;
        summary.readyAmount += row.amount ?? 0;
      }
      if (row.status === "duplicate") summary.duplicateRows += 1;
      if (row.status === "skipped") summary.skippedRows += 1;
      if (row.status === "error") summary.errorRows += 1;

      return summary;
    },
    { ...emptyImportSummary },
  );
}

function withMessage(message: string): ImportActionState {
  return {
    ...initialImportState,
    message,
  };
}

function parsePayload(rawPayload: string):
  | { ok: true; payload: z.infer<typeof savePayloadSchema> }
  | { ok: false; message: string } {
  try {
    const parsedJson = JSON.parse(rawPayload) as unknown;
    const payload = savePayloadSchema.parse(parsedJson);
    return { ok: true, payload };
  } catch {
    return { ok: false, message: "가져오기 데이터 형식이 올바르지 않습니다." };
  }
}

function stateFromPayload(rows: ImportPreviewRow[]): ImportActionState {
  const firstRow = rows[0];

  return {
    ok: rows.length > 0,
    message: null,
    provider: firstRow?.provider ?? null,
    providerLabel: firstRow?.provider === "samsung" ? "삼성카드" : null,
    fileName: null,
    sourceFileId: firstRow?.sourceFileId ?? null,
    rows,
    summary: summarize(rows),
    savedCount: 0,
  };
}
