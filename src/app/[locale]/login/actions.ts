"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";

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
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect(`/${locale}`);
}
