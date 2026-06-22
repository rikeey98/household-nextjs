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
  type ImportProvider,
  initialImportState,
} from "@/features/import/types";
import {
  detectCardExcelParser,
  detectCardHtmlParser,
} from "@/features/import/parsers";

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const PROVIDER_LABELS: Record<ImportProvider, string> = {
  samsung: "삼성카드",
  shinhan: "신한카드",
};
const importProviderSchema = z.enum(["samsung", "shinhan"]);

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
  provider: importProviderSchema,
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
  originalCurrency: z.string().trim().length(3),
  originalAmount: z.number().positive().nullable(),
  approvalNumber: z.string().nullable(),
  importFingerprint: z.string().min(20),
  sourceMetadata: importSourceMetadataSchema,
  status: z.enum(["ready", "duplicate", "skipped", "error"]),
  statusReason: z.string().nullable(),
});

const savePayloadSchema = z.object({
  provider: importProviderSchema,
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
    const buffer = Buffer.from(await file.arrayBuffer());
    const htmlCandidates = decodePossibleHtmlCandidates(buffer);
    const htmlParsed = parseHtmlFile(htmlCandidates, { fileName, sourceFileId });
    if (htmlCandidates.length > 0 && !htmlParsed) {
      return withMessage("지원하는 카드 이용내역 형식을 찾지 못했습니다.");
    }

    const parsed =
      htmlParsed ?? (await parseExcelFile(buffer, { fileName, sourceFileId }));

    if (!parsed) {
      return withMessage("지원하는 카드 이용내역 형식을 찾지 못했습니다.");
    }

    const rows = await markDuplicateRows(parsed.rows, supabase, userId);

    return {
      ok: true,
      message: `${rows.length.toLocaleString("ko-KR")}개 행을 확인했습니다.`,
      provider: parsed.provider,
      providerLabel: parsed.label,
      fileName,
      sourceFileId,
      rows,
      summary: summarize(rows),
      savedCount: 0,
    };
  } catch (error) {
    console.error("Card import parsing failed", {
      fileSize: file.size,
      message: error instanceof Error ? error.message : String(error),
    });

    return withMessage(
      error instanceof Error
        ? `파일을 읽지 못했습니다. ${error.message}`
        : "파일을 읽지 못했습니다.",
    );
  }
}

function parseHtmlFile(
  htmlCandidates: string[],
  context: { fileName: string; sourceFileId: string },
) {
  for (const html of htmlCandidates) {
    const parser = detectCardHtmlParser(html);
    if (!parser) continue;

    return {
      provider: parser.provider,
      label: parser.label,
      rows: parser.parse(html, context),
    };
  }

  return null;
}

async function parseExcelFile(
  buffer: Buffer,
  context: { fileName: string; sourceFileId: string },
) {
  const workbook = await loadWorkbook(buffer);
  const parser = detectCardExcelParser(workbook);
  if (!parser) return null;

  return {
    provider: parser.provider,
    label: parser.label,
    rows: parser.parse(workbook, context),
  };
}

async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  return workbook;
}

function decodePossibleHtmlCandidates(buffer: Buffer) {
  return decodeTextCandidates(buffer).filter(looksLikeHtml);
}

function decodeTextCandidates(buffer: Buffer) {
  const candidates: string[] = [];

  addTextCandidate(candidates, buffer.toString("utf8"));

  for (const encoding of ["utf-16le", "euc-kr"]) {
    try {
      addTextCandidate(
        candidates,
        new TextDecoder(encoding).decode(buffer as unknown as BufferSource),
      );
    } catch {
      // TextDecoder support can vary by runtime; UTF-8 remains the default path.
    }
  }

  return candidates;
}

function addTextCandidate(candidates: string[], text: string) {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!candidates.includes(normalized)) candidates.push(normalized);
}

function looksLikeHtml(text: string) {
  return /<(?:html|table|body|meta)\b/i.test(text.slice(0, 20000));
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
    providerLabel: firstRow ? PROVIDER_LABELS[firstRow.provider] : null,
    fileName: null,
    sourceFileId: firstRow?.sourceFileId ?? null,
    rows,
    summary: summarize(rows),
    savedCount: 0,
  };
}
