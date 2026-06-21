import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>로그인 실패</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            Google 인증 응답을 처리하지 못했습니다.
          </p>
          <Link
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)]"
            href="/login"
          >
            다시 로그인
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
