"use client";

import { useActionState, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import {
  parseCardExcel,
  saveCardImport,
} from "@/features/import/actions";
import {
  initialImportState,
  type ImportActionState,
  type ImportPreviewRow,
  type ImportRowStatus,
} from "@/features/import/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

const statusLabels: Record<ImportRowStatus, string> = {
  ready: "저장 대기",
  duplicate: "중복",
  skipped: "제외",
  error: "오류",
};

export function ImportManager() {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parseState, parseAction, isParsing] = useActionState(
    parseCardExcel,
    initialImportState,
  );
  const [saveState, saveAction, isSaving] = useActionState(
    saveCardImport,
    initialImportState,
  );
  const activeState = saveState.rows.length > 0 ? saveState : parseState;
  const payload = useMemo(() => buildPayload(activeState), [activeState]);
  const readyRows = activeState.summary.readyRows;

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-[var(--primary)]" />
              파일 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={parseAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-file">카드 이용내역</Label>
                <input
                  id="card-file"
                  name="file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="sr-only"
                  onChange={(event) => {
                    setSelectedFileName(event.target.files?.[0]?.name ?? null);
                  }}
                />
                <label
                  htmlFor="card-file"
                  className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[#fbfaf6] px-4 py-5 text-center transition-colors hover:border-[var(--primary)] hover:bg-[#f4f1e8]"
                >
                  <span className="flex size-11 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]">
                    <Upload className="size-5" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-[#263029]">
                    엑셀 파일 선택
                  </span>
                  <span className="mt-1 max-w-full truncate text-xs text-[var(--muted-foreground)]">
                    {selectedFileName ?? "삼성 XLSX 또는 신한 XLS/XLSX"}
                  </span>
                </label>
              </div>

              <Button type="submit" disabled={isParsing} className="w-full gap-2">
                <Upload className="size-4" />
                {isParsing ? "분석 중" : "미리보기"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <SummaryPanel state={activeState} />

        {activeState.rows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-4 text-[var(--primary)]" />
                저장
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={saveAction} className="space-y-3">
                <input name="payload" type="hidden" value={payload} />
                <Button
                  type="submit"
                  disabled={isSaving || readyRows === 0}
                  className="w-full gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  {isSaving ? "저장 중" : "준비 행 저장"}
                </Button>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {readyRows.toLocaleString("ko-KR")}개 거래
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="space-y-4">
        <StatusMessage state={activeState} />
        <PreviewTable rows={activeState.rows} />
      </section>
    </div>
  );
}

function SummaryPanel({ state }: { state: ImportActionState }) {
  const summary = state.summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>요약</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Metric label="전체" value={summary.totalRows} />
          <Metric label="저장 대기" value={summary.readyRows} />
          <Metric label="중복" value={summary.duplicateRows} />
          <Metric label="제외/오류" value={summary.skippedRows + summary.errorRows} />
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[#fbfaf6] p-3">
          <div className="text-xs text-[var(--muted-foreground)]">대기 금액</div>
          <div className="mt-1 text-lg font-semibold">
            {formatCurrency(summary.readyAmount)}
          </div>
        </div>

        {state.providerLabel || state.fileName ? (
          <div className="space-y-1 text-xs text-[var(--muted-foreground)]">
            {state.providerLabel ? <div>{state.providerLabel}</div> : null}
            {state.fileName ? <div className="break-all">{state.fileName}</div> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-3">
      <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">
        {value.toLocaleString("ko-KR")}
      </div>
    </div>
  );
}

function StatusMessage({ state }: { state: ImportActionState }) {
  if (!state.message) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        state.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-[var(--danger)]",
      )}
    >
      {state.ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  );
}

function PreviewTable({ rows }: { rows: ImportPreviewRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5">
          <div className="rounded-md border border-dashed border-[var(--border)] p-8 text-sm text-[var(--muted-foreground)]">
            미리보기 데이터가 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>미리보기</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <th className="py-2 pr-3 font-medium">행</th>
                <th className="py-2 pr-3 font-medium">상태</th>
                <th className="py-2 pr-3 font-medium">승인일</th>
                <th className="py-2 pr-3 font-medium">결제일</th>
                <th className="py-2 pr-3 font-medium">가맹점</th>
                <th className="py-2 pr-3 text-right font-medium">금액</th>
                <th className="py-2 pr-3 font-medium">할부</th>
                <th className="py-2 font-medium">승인번호</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.rowKey}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="py-3 pr-3 text-[var(--muted-foreground)]">
                    {row.excelRowNumber}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge row={row} />
                  </td>
                  <td className="py-3 pr-3">{row.date ?? "-"}</td>
                  <td className="py-3 pr-3">{row.paymentDueDate ?? "-"}</td>
                  <td className="max-w-[260px] truncate py-3 pr-3">
                    {row.description || "-"}
                  </td>
                  <td className="py-3 pr-3 text-right font-medium">
                    {row.amount ? formatCurrency(row.amount) : "-"}
                  </td>
                  <td className="py-3 pr-3">
                    {row.installmentMonths > 0
                      ? `${row.installmentMonths}개월`
                      : "일시불"}
                  </td>
                  <td className="py-3">{row.approvalNumber ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ row }: { row: ImportPreviewRow }) {
  return (
    <span
      title={row.statusReason ?? statusLabels[row.status]}
      className={cn(
        "inline-flex h-7 items-center rounded px-2 text-xs font-medium",
        row.status === "ready" && "bg-emerald-50 text-emerald-800",
        row.status === "duplicate" && "bg-[var(--muted)] text-[#4b524c]",
        row.status === "skipped" && "bg-amber-50 text-amber-800",
        row.status === "error" && "bg-red-50 text-[var(--danger)]",
      )}
    >
      {statusLabels[row.status]}
    </span>
  );
}

function buildPayload(state: ImportActionState) {
  return JSON.stringify({
    provider: state.provider,
    sourceFileId: state.sourceFileId,
    rows: state.rows,
  });
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}
