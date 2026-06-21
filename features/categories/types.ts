export type CategoryType = "income" | "expense";

export type Category = {
  id: number;
  user_id: string;
  name: string;
  category_type: CategoryType;
  parent_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

