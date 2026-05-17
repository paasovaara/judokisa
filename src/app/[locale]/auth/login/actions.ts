"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase, supabaseConfigured } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const magicLinkSchema = z.object({
  email: z.string().email(),
});

export type AuthState =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function loginWithPassword(
  locale: string,
  _prev: AuthState | null,
  form: FormData,
): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured. Use /login for the dev mock." };
  }
  const parsed = credentialsSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Email and password (min 8 chars) required" };
  }
  const sb = await getServerSupabase();
  if (!sb) return { ok: false, error: "Supabase client unavailable" };

  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  redirect(`/${locale}/profile`);
}

export async function sendMagicLink(
  locale: string,
  _prev: AuthState | null,
  form: FormData,
): Promise<AuthState> {
  if (!supabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const parsed = magicLinkSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { ok: false, error: "Valid email required" };

  const sb = await getServerSupabase();
  if (!sb) return { ok: false, error: "Supabase client unavailable" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { error } = await sb.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Magic-link landing path — bring the user back to the profile after
      // the link is clicked. NEXT_PUBLIC_SITE_URL is read for absolute URLs;
      // relative path also works when Supabase's site URL is configured.
      emailRedirectTo: siteUrl
        ? `${siteUrl}/${locale}/profile`
        : `/${locale}/profile`,
    },
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: "Check your email for a sign-in link." };
}
