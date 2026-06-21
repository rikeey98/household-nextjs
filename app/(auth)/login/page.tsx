import { signInWithGoogle } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
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
        </CardContent>
      </Card>
    </main>
  );
}
