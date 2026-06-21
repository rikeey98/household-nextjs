"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/auth";

const categorySchema = z.object({
  name: z.string().trim().min(1, "카테고리 이름을 입력하세요."),
  category_type: z.enum(["income", "expense"]),
  parent_id: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }),
});

export async function createCategory(formData: FormData) {
  const { supabase, userId } = await getCurrentUserId();
  const input = categorySchema.parse({
    name: formData.get("name"),
    category_type: formData.get("category_type"),
    parent_id: formData.get("parent_id")?.toString(),
  });

  const { error } = await supabase.from("categories").insert({
    user_id: userId,
    name: input.name,
    category_type: input.category_type,
    parent_id: input.parent_id,
  });

  if (error) {
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategory(formData: FormData) {
  const { supabase, userId } = await getCurrentUserId();
  const id = Number(formData.get("id"));
  const input = categorySchema.parse({
    name: formData.get("name"),
    category_type: formData.get("category_type"),
    parent_id: formData.get("parent_id")?.toString(),
  });

  if (!Number.isFinite(id)) {
    redirect("/categories?error=Invalid%20category%20id");
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      category_type: input.category_type,
      parent_id: input.parent_id,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/categories");
  redirect("/categories");
}

export async function deleteCategory(formData: FormData) {
  const { supabase, userId } = await getCurrentUserId();
  const id = Number(formData.get("id"));

  if (!Number.isFinite(id)) {
    redirect("/categories?error=Invalid%20category%20id");
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    redirect(`/categories?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/categories");
  redirect("/categories");
}
