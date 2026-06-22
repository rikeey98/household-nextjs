import { ImportManager } from "@/features/import/import-manager";

export const runtime = "nodejs";

export default function ImportPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">거래 가져오기</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          카드 이용내역 파일을 확인하고 새 거래만 저장합니다.
        </p>
      </div>

      <ImportManager />
    </main>
  );
}
