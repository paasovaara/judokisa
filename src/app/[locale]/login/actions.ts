"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { getServerSupabase, supabaseConfigured } from "@/lib/supabase/server";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function loginAs(locale: string, userId: string) {
  if (!userId) throw new Error("userId required");
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  revalidatePath("/", "layout");
  redirect(`/${locale}/profile`);
}

export async function logout(locale: string) {
  // Clear both the mock cookie and the Supabase session so a user is signed
  // out cleanly regardless of which scheme drove their last login.
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  if (supabaseConfigured()) {
    try {
      const sb = await getServerSupabase();
      if (sb) await sb.auth.signOut();
    } catch {
      // Signing out of Supabase is best-effort; the mock cookie is the
      // primary fallback session.
    }
  }
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}
