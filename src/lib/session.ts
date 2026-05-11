// Mock session — auth is out of scope this wave. A simple httpOnly cookie
// stores the id of the DB user we're "logged in as". Real auth (email/password,
// social) will replace this layer; the rest of the app can already query the
// current user through these helpers.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "mockUserId";

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  return id && id.length > 0 ? id : null;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  try {
    return await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  } catch {
    return null;
  }
}

export async function requireCurrentUser(locale: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}
