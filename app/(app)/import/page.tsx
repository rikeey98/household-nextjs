import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">거래 가져오기</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          기존 카드 내역 파서와 중복 검사 로직을 이 화면으로 포팅합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>파일 업로드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-[var(--border)] p-8 text-sm text-[var(--muted-foreground)]">
            업로드, 미리보기, 카테고리 매칭, 저장 단계를 구현합니다.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

