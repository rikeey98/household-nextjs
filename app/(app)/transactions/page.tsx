import { TransactionManager } from "@/features/transactions/transaction-manager";
import type { Transaction } from "@/features/transactions/types";
import type { Category } from "@/features/categories/types";
import { createClient } from "@/lib/supabase/server";

type TransactionsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const { error: actionError } = await searchParams;
  const supabase = await createClient();

  const [transactionsResult, categoriesResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id,user_id,date,amount,transaction_type,category_id,description,payment_method,created_at,updated_at,category:categories(id,name,category_type)",
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("categories")
      .select("id,user_id,name,category_type,parent_id,created_at,updated_at")
      .order("category_type", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const error =
    actionError ??
    transactionsResult.error?.message ??
    categoriesResult.error?.message;
  const transactions = (
    (transactionsResult.data ?? []) as unknown as Array<
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

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">거래 내역</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          최근 100건을 기준으로 거래를 관리합니다.
        </p>
      </div>

      <TransactionManager
        transactions={transactions}
        categories={(categoriesResult.data ?? []) as Category[]}
        error={error}
      />
    </main>
  );
}
