import { CategoryManager } from "@/features/categories/category-manager";
import type { Category } from "@/features/categories/types";
import { createClient } from "@/lib/supabase/server";

type CategoriesPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const { error: actionError } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,user_id,name,category_type,parent_id,created_at,updated_at")
    .order("category_type", { ascending: true })
    .order("name", { ascending: true });

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">카테고리</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          수입/지출 카테고리 트리를 Supabase와 연결합니다.
        </p>
      </div>

      <CategoryManager
        categories={(data ?? []) as Category[]}
        error={actionError ?? error?.message}
      />
    </main>
  );
}
