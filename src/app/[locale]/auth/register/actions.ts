"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getServerSupabase, supabaseConfigured } from "@/lib/supabase/server";

// Open self-signup. Email confirmation is on by default in Supabase Auth;
// the new auth.users row exists immediately but the user must click the
// confirmation link before they can sign in. The companion User + UserProfile
// rows are created in this action so the rest of the app can address the
// new user by their app id from day one.

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
});

export type SignUpState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function signUp(
  locale: string,
  _prev: SignUpState | null,
  form: FormData,
): Promise<SignUpState> {
  if (!supabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase is not configured. Sign-up requires the auth backend.",
    };
  }

  const parsed = schema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    firstName: form.get("firstName"),
    lastName: form.get("lastName"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Email, password (min 8 chars), first name, and last name are all required.",
    };
  }
  const { email, password, firstName, lastName } = parsed.data;

  const sb = await getServerSupabase();
  if (!sb) return { ok: false, error: "Supabase client unavailable" };

  // Reject early if an app User already owns this email — prevents creating
  // an orphan auth.users row that conflicts with an existing User.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { firstName, lastName },
      emailRedirectTo: siteUrl
        ? `${siteUrl}/${locale}/profile`
        : `/${locale}/profile`,
    },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "Sign-up did not return a user" };

  // Mirror into our schema. If this fails we surface the error but the
  // auth.users row remains — admin can run a backfill later.
  try {
    await prisma.user.create({
      data: {
        authUserId: data.user.id,
        email,
        firstName,
        lastName,
        profile: { create: {} },
      },
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `Auth account created but profile setup failed: ${e.message}. Contact support.`
          : "Profile setup failed after sign-up.",
    };
  }

  // When email confirmation is enabled in Supabase (default), there's no
  // active session yet — the user must click the confirmation link. Surface
  // a check-your-inbox message rather than redirecting.
  return {
    ok: true,
    message:
      "Account created. Check your email for a confirmation link to finish signing up.",
  };
}
