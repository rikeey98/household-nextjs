"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/categories/actions";
import type { Category, CategoryType } from "@/features/categories/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type CategoryManagerProps = {
  categories: Category[];
  error?: string;
};

const tabs: Array<{ label: string; value: CategoryType }> = [
  { label: "지출", value: "expense" },
  { label: "수입", value: "income" },
];

export function CategoryManager({ categories, error }: CategoryManagerProps) {
  const [activeType, setActiveType] = useState<CategoryType>("expense");
  const [editing, setEditing] = useState<Category | null>(null);

  const activeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.category_type === activeType)
        .sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [activeType, categories],
  );

  const rootCategories = activeCategories.filter((category) => !category.parent_id);
  const childCategories = activeCategories.filter((category) => category.parent_id);
  const action = editing ? updateCategory : createCategory;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <div className="inline-flex rounded-md border border-[var(--border)] bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={cn(
                "h-9 rounded px-4 text-sm font-medium",
                activeType === tab.value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[#263029] hover:bg-[var(--muted)]",
              )}
              onClick={() => {
                setActiveType(tab.value);
                setEditing(null);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeType === "expense" ? "지출 카테고리" : "수입 카테고리"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCategories.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] p-8 text-sm text-[var(--muted-foreground)]">
                아직 카테고리가 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {rootCategories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    childrenRows={childCategories.filter(
                      (child) => child.parent_id === category.id,
                    )}
                    onEdit={setEditing}
                  />
                ))}
                {childCategories
                  .filter(
                    (child) =>
                      !rootCategories.some((root) => root.id === child.parent_id),
                  )
                  .map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      childrenRows={[]}
                      onEdit={setEditing}
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "카테고리 수정" : "카테고리 추가"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {editing ? <input name="id" type="hidden" value={editing.id} /> : null}
            <input name="category_type" type="hidden" value={activeType} />

            <div className="space-y-2">
              <Label htmlFor="category-name">이름</Label>
              <Input
                key={editing?.id ?? "new"}
                id="category-name"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                placeholder="예: 식비"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent-id">상위 카테고리</Label>
              <select
                key={`${editing?.id ?? "new"}-parent`}
                id="parent-id"
                name="parent_id"
                defaultValue={editing?.parent_id ?? ""}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--primary)]"
              >
                <option value="">없음</option>
                {rootCategories
                  .filter((category) => category.id !== editing?.id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editing ? "수정" : "추가"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
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

function CategoryRow({
  category,
  childrenRows,
  onEdit,
}: {
  category: Category;
  childrenRows: Category[];
  onEdit: (category: Category) => void;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white">
      <div className="flex min-h-12 items-center justify-between gap-3 px-4">
        <div>
          <div className="text-sm font-medium">{category.name}</div>
          {category.parent_id ? (
            <div className="text-xs text-[var(--muted-foreground)]">하위</div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onEdit(category)}
            aria-label={`${category.name} 수정`}
          >
            <Pencil className="size-4" />
          </Button>
          <form action={deleteCategory}>
            <input name="id" type="hidden" value={category.id} />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              aria-label={`${category.name} 삭제`}
            >
              <Trash2 className="size-4 text-[var(--danger)]" />
            </Button>
          </form>
        </div>
      </div>
      {childrenRows.length > 0 ? (
        <div className="border-t border-[var(--border)] bg-[#fafaf7] px-4 py-2">
          <div className="space-y-2 border-l border-[var(--border)] pl-3">
            {childrenRows.map((child) => (
              <div
                key={child.id}
                className="flex min-h-10 items-center justify-between gap-3"
              >
                <span className="text-sm">{child.name}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(child)}
                    aria-label={`${child.name} 수정`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <form action={deleteCategory}>
                    <input name="id" type="hidden" value={child.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      aria-label={`${child.name} 삭제`}
                    >
                      <Trash2 className="size-4 text-[var(--danger)]" />
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
