"use server";

import { z } from "zod";
import { getServerSupabase, supabaseConfigured } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().email() });

export type ResetState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function sendResetEmail(
  locale: string,
  _prev: ResetState | null,
  form: FormData,
): Promise<ResetState> {
  if (!supabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const parsed = schema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { ok: false, error: "Valid email required" };

  const sb = await getServerSupabase();
  if (!sb) return { ok: false, error: "Supabase client unavailable" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await sb.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: siteUrl
      ? `${siteUrl}/${locale}/auth/reset-password`
      : `/${locale}/auth/reset-password`,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}
