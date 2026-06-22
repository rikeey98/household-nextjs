import type { Category, CategoryType } from "@/features/categories/types";

export type PaymentMethod = "cash" | "card" | "account";

export type Transaction = {
  id: number;
  user_id: string;
  date: string;
  amount: number | string;
  transaction_type: CategoryType;
  category_id: number | null;
  description: string | null;
  payment_method: PaymentMethod;
  installment_months?: number | null;
  original_currency?: string | null;
  original_amount?: number | string | null;
  source_type?: string | null;
  source_provider?: string | null;
  source_file_id?: string | null;
  source_row_index?: number | null;
  import_fingerprint?: string | null;
  occurred_at?: string | null;
  payment_due_date?: string | null;
  source_metadata?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  category?: Pick<Category, "id" | "name" | "category_type"> | null;
};
