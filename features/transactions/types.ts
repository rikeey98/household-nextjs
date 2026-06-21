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
  created_at: string | null;
  updated_at: string | null;
  category?: Pick<Category, "id" | "name" | "category_type"> | null;
};

