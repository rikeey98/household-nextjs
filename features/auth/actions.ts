"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (requestHeaders.get("origin") ?? `http://${requestHeaders.get("host")!}`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.url) {
    redirect("/login?error=Google%20OAuth%20URL%20creation%20failed");
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
