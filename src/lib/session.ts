// Session lookup. Reads identity from Supabase Auth when env is configured;
// falls back to the legacy `mockUserId` httpOnly cookie when not. The
// transition between the two is intentional: the mock scaffold continues to
// work for local development until SUPABASE_URL/ANON_KEY are set, at which
// point production sessions seamlessly take over.
//
// `requireTargetUser(targetUserId)` resolves the user the request is *operating
// on* (the parent themselves, or one of their dependents). Pages and server
// actions under /profile/dependents/[id]/* use it instead of requireCurrentUser
// to make guardian-aware authorization explicit. See docs/guardianship.md §5.3.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCanActAs } from "@/lib/guardianship";
import { getServerSupabase, supabaseConfigured } from "@/lib/supabase/server";

export const SESSION_COOKIE = "mockUserId";

/**
 * Resolve the current user's `User.id`. Order of resolution:
 *   1. Supabase Auth session → look up User.authUserId.
 *   2. Mock cookie (dev fallback) → look up User.id directly.
 * Returns null if neither yields a known user.
 */
export async function getSessionUserId(): Promise<string | null> {
  // 1. Supabase session, when configured.
  if (supabaseConfigured()) {
    try {
      const sb = await getServerSupabase();
      const { data, error } = sb ? await sb.auth.getUser() : { data: { user: null }, error: null };
      if (!error && data.user) {
        const u = await prisma.user.findUnique({
          where: { authUserId: data.user.id },
          select: { id: true },
        });
        if (u) return u.id;
      }
    } catch {
      // Fall through to cookie fallback if Supabase is misconfigured at runtime.
    }
  }

  // 2. Mock fallback for local development.
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
      include: { profile: { include: { club: true } } },
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

// Admin-relevant role flags per docs/spec.md §6.7. Any one of these grants
// access to /admin/* surfaces; specific actions may want a narrower check.
const ADMIN_ROLE_FIELDS = [
  "isAdministrator",
  "isCommission",
  "isCoordinator",
  "isCompetitionManager",
  "isCompetitionAssistant",
  "isCompetitionResponsible",
  "isCourseInstructor",
] as const;

function hasAdminRole(profile: { [k in (typeof ADMIN_ROLE_FIELDS)[number]]?: boolean } | null | undefined): boolean {
  if (!profile) return false;
  return ADMIN_ROLE_FIELDS.some((f) => profile[f] === true);
}

/**
 * Require the current user to have at least one admin-relevant role flag.
 * Redirects unauthenticated callers to login; redirects authenticated but
 * unauthorized callers to /profile. Returns the user for downstream use.
 */
export async function requireAdmin(locale: string) {
  const user = await requireCurrentUser(locale);
  if (!hasAdminRole(user.profile)) {
    redirect(`/${locale}/profile`);
  }
  return user;
}

/**
 * Resolve the user a request is operating on, given a targetUserId from the
 * route (e.g. /profile/dependents/[id]). Asserts the session user is allowed
 * to act on the target's behalf (self or active guardian). Redirects to login
 * if there is no session; throws if the session user has no relationship to
 * the target. Returns the resolved User (with profile + club).
 */
export async function requireTargetUser(targetUserId: string, locale: string) {
  const me = await requireCurrentUser(locale);
  await requireCanActAs(me.id, targetUserId);
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { profile: { include: { club: true } } },
  });
  if (!target) {
    throw new Error("Forbidden: you cannot act on behalf of this user");
  }
  return target;
}
