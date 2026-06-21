import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Transaction } from "@/features/transactions/types";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { startDate, endDate } = getCurrentMonthRange();

  const [monthResult, recentResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,date,amount,transaction_type,payment_method,description")
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("transactions")
      .select(
        "id,date,amount,transaction_type,category_id,description,payment_method,category:categories(id,name,category_type)",
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const monthTransactions = (monthResult.data ?? []) as Pick<
    Transaction,
    "amount" | "transaction_type"
  >[];
  const recentTransactions = (
    (recentResult.data ?? []) as unknown as Array<
      Transaction & {
        category?: Transaction["category"] | Transaction["category"][];
      }
    >
  ).map((transaction) => ({
    ...transaction,
    category: Array.isArray(transaction.category)
      ? (transaction.category[0] ?? null)
      : (transaction.category ?? null),
  }));

  const totals = monthTransactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.transaction_type === "income") acc.income += amount;
      if (transaction.transaction_type === "expense") acc.expense += amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
  const metrics = [
    { label: "이번 달 수입", value: formatCurrency(totals.income) },
    { label: "이번 달 지출", value: formatCurrency(totals.expense) },
    {
      label: "잔액",
      value: formatCurrency(totals.income - totals.expense),
    },
  ];
  const error = monthResult.error?.message ?? recentResult.error?.message;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">대시보드</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {startDate}부터 {endDate}까지의 흐름을 보여줍니다.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle>{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>최근 거래</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted-foreground)]">
                아직 거래가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-[var(--border)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {transaction.description || "거래"}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {transaction.date} · {transaction.category?.name ?? "미분류"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold">
                      {transaction.transaction_type === "expense" ? "-" : "+"}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>이번 달 요약</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <SummaryLine label="수입" value={formatCurrency(totals.income)} />
              <SummaryLine label="지출" value={formatCurrency(totals.expense)} />
              <SummaryLine
                label="잔액"
                value={formatCurrency(totals.income - totals.expense)}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function getCurrentMonthRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number | string) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}
