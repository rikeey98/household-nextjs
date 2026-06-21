"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { Category, CategoryType } from "@/features/categories/types";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/features/transactions/actions";
import type {
  PaymentMethod,
  Transaction,
} from "@/features/transactions/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type TransactionManagerProps = {
  transactions: Transaction[];
  categories: Category[];
  error?: string;
};

const typeLabels: Record<CategoryType, string> = {
  expense: "지출",
  income: "수입",
};

const paymentLabels: Record<PaymentMethod, string> = {
  cash: "현금",
  card: "카드",
  account: "계좌",
};

export function TransactionManager({
  transactions,
  categories,
  error,
}: TransactionManagerProps) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<CategoryType>(
    editing?.transaction_type ?? "expense",
  );
  const [filterType, setFilterType] = useState<CategoryType | "all">("all");

  const action = editing ? updateTransaction : createTransaction;

  const filteredTransactions = useMemo(() => {
    if (filterType === "all") return transactions;
    return transactions.filter(
      (transaction) => transaction.transaction_type === filterType,
    );
  }, [filterType, transactions]);

  const categoryOptions = categories
    .filter((category) => category.category_type === formType)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.amount);
        if (transaction.transaction_type === "income") acc.income += amount;
        if (transaction.transaction_type === "expense") acc.expense += amount;
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [transactions]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <Summary label="수입" value={formatCurrency(totals.income)} />
          <Summary label="지출" value={formatCurrency(totals.expense)} />
          <Summary label="잔액" value={formatCurrency(totals.income - totals.expense)} />
        </div>

        <div className="inline-flex rounded-md border border-[var(--border)] bg-white p-1">
          {[
            { label: "전체", value: "all" as const },
            { label: "지출", value: "expense" as const },
            { label: "수입", value: "income" as const },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                "h-9 rounded px-4 text-sm font-medium",
                filterType === item.value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[#263029] hover:bg-[var(--muted)]",
              )}
              onClick={() => setFilterType(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>거래 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] p-8 text-sm text-[var(--muted-foreground)]">
                아직 거래가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                      <th className="py-2 pr-3 font-medium">날짜</th>
                      <th className="py-2 pr-3 font-medium">타입</th>
                      <th className="py-2 pr-3 font-medium">카테고리</th>
                      <th className="py-2 pr-3 text-right font-medium">금액</th>
                      <th className="py-2 pr-3 font-medium">결제수단</th>
                      <th className="py-2 pr-3 font-medium">설명</th>
                      <th className="py-2 text-right font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-3 pr-3">{transaction.date}</td>
                        <td className="py-3 pr-3">
                          {typeLabels[transaction.transaction_type]}
                        </td>
                        <td className="py-3 pr-3">
                          {transaction.category?.name ?? "-"}
                        </td>
                        <td className="py-3 pr-3 text-right font-medium">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-3 pr-3">
                          {paymentLabels[transaction.payment_method]}
                        </td>
                        <td className="max-w-[220px] truncate py-3 pr-3">
                          {transaction.description || "-"}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`${transaction.description ?? "거래"} 수정`}
                              onClick={() => {
                                setEditing(transaction);
                                setFormType(transaction.transaction_type);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <form action={deleteTransaction}>
                              <input name="id" type="hidden" value={transaction.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                aria-label={`${transaction.description ?? "거래"} 삭제`}
                              >
                                <Trash2 className="size-4 text-[var(--danger)]" />
                              </Button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "거래 수정" : "거래 추가"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {editing ? <input name="id" type="hidden" value={editing.id} /> : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="transaction-type">타입</Label>
                <select
                  key={`${editing?.id ?? "new"}-type`}
                  id="transaction-type"
                  name="transaction_type"
                  defaultValue={editing?.transaction_type ?? formType}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
                  onChange={(event) => setFormType(event.target.value as CategoryType)}
                >
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">결제수단</Label>
                <select
                  key={`${editing?.id ?? "new"}-payment`}
                  id="payment-method"
                  name="payment_method"
                  defaultValue={editing?.payment_method ?? "card"}
                  className="h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
                >
                  <option value="card">카드</option>
                  <option value="cash">현금</option>
                  <option value="account">계좌</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-date">거래일</Label>
              <Input
                key={`${editing?.id ?? "new"}-date`}
                id="transaction-date"
                name="date"
                type="date"
                required
                defaultValue={editing?.date ?? new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">금액</Label>
              <Input
                key={`${editing?.id ?? "new"}-amount`}
                id="amount"
                name="amount"
                type="number"
                min="1"
                required
                defaultValue={editing ? String(editing.amount) : ""}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-id">카테고리</Label>
              <select
                key={`${editing?.id ?? "new"}-${formType}-category`}
                id="category-id"
                name="category_id"
                defaultValue={editing?.category_id ?? ""}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
              >
                <option value="">미분류</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Input
                key={`${editing?.id ?? "new"}-description`}
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
                placeholder="예: 점심"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editing ? "수정" : "추가"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setFormType("expense");
                  }}
                  aria-label="수정 취소"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <div className="text-sm text-[var(--muted-foreground)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function formatCurrency(value: number | string) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

