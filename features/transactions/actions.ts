"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "거래일을 선택하세요."),
  amount: z.coerce.number().positive("금액은 0보다 커야 합니다."),
  transaction_type: z.enum(["income", "expense"]),
  category_id: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }),
  description: z.string().trim().max(200).optional(),
  payment_method: z.enum(["cash", "card", "account"]),
});

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  return { supabase, userId: data.claims.sub };
}

export async function createTransaction(formData: FormData) {
  const { supabase, userId } = await getCurrentUserId();
  const input = transactionSchema.parse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    transaction_type: formData.get("transaction_type"),
    category_id: formData.get("category_id")?.toString(),
    description: formData.get("description"),
    payment_method: formData.get("payment_method"),
  });

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    date: input.date,
    amount: input.amount,
    transaction_type: input.transaction_type,
    category_id: input.category_id,
    description: input.description ?? "",
    payment_method: input.payment_method,
  });

  if (error) {
    redirect(`/transactions?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function updateTransaction(formData: FormData) {
  const { supabase } = await getCurrentUserId();
  const id = Number(formData.get("id"));
  const input = transactionSchema.parse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    transaction_type: formData.get("transaction_type"),
    category_id: formData.get("category_id")?.toString(),
    description: formData.get("description"),
    payment_method: formData.get("payment_method"),
  });

  if (!Number.isFinite(id)) {
    redirect("/transactions?error=Invalid%20transaction%20id");
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      date: input.date,
      amount: input.amount,
      transaction_type: input.transaction_type,
      category_id: input.category_id,
      description: input.description ?? "",
      payment_method: input.payment_method,
    })
    .eq("id", id);

  if (error) {
    redirect(`/transactions?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function deleteTransaction(formData: FormData) {
  const { supabase } = await getCurrentUserId();
  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    redirect("/transactions?error=Invalid%20transaction%20id");
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    redirect(`/transactions?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

