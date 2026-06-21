import Link from "next/link";
import { signInWithGoogle } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>계정 시작</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}
          <form action={signInWithGoogle}>
            <Button type="submit" className="w-full gap-3">
              <span className="flex size-5 items-center justify-center rounded bg-white text-sm font-semibold text-[#4285f4]">
                G
              </span>
              Google로 계속하기
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
            이미 연결했다면{" "}
            <Link className="font-medium text-[var(--primary)]" href="/login">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
