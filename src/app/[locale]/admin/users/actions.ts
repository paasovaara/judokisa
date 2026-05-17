"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/session";
import { wouldFormCycle } from "@/lib/guardianship";
import type { GeographicArea, GuardianshipRelation, JudoGrade, RefereeLicenseLevel } from "@prisma/client";
import { ROLE_KEYS, type RoleKey } from "./roles";

const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"] as const;
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"] as const;
const LICENSES = ["D", "C", "B", "A", "INT_B", "INT_A"] as const;

function str(form: FormData, key: string): string {
  return ((form.get(key) ?? "") as string).trim();
}
function strOrNull(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}
function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}
function intOrNull(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function dateOrNull(form: FormData, key: string): Date | null {
  const v = str(form, key);
  if (v === "") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function pickEnum<T extends readonly string[]>(values: T, raw: string): T[number] | null {
  return (values as readonly string[]).includes(raw) ? (raw as T[number]) : null;
}

function buildUserData(form: FormData) {
  return {
    email: str(form, "email"),
    firstName: str(form, "firstName"),
    lastName: str(form, "lastName"),
  };
}

async function buildProfileData(form: FormData) {
  const area = pickEnum(AREAS, str(form, "geographicArea"));
  const grade = pickEnum(GRADES, str(form, "judoGrade"));
  const license = pickEnum(LICENSES, str(form, "refereeLicenseLevel"));

  const roles = Object.fromEntries(
    ROLE_KEYS.map((k) => [k, bool(form, k)]),
  ) as Record<RoleKey, boolean>;

  // Validate clubId is a real Club; drop unknown ids rather than violating FK.
  const rawClubId = strOrNull(form, "clubId");
  const clubId = rawClubId
    ? ((await prisma.club.findUnique({ where: { id: rawClubId }, select: { id: true } }))?.id ?? null)
    : null;

  return {
    ...roles,
    phone: strOrNull(form, "phone"),
    dateOfBirth: dateOrNull(form, "dateOfBirth"),
    address: strOrNull(form, "address"),
    clubId,
    geographicArea: area as GeographicArea | null,
    judoGrade: grade as JudoGrade | null,
    refereeLicenseLevel: license as RefereeLicenseLevel | null,
    suomiSportInternalId: intOrNull(form, "suomiSportInternalId"),
    suomiSportPersonId: intOrNull(form, "suomiSportPersonId"),
    active: !bool(form, "_inactive"),
    blacklisted: bool(form, "blacklisted"),
    gdprNoSync: bool(form, "gdprNoSync"),
    defaultCategoryCode: strOrNull(form, "defaultCategoryCode"),
    defaultWeightClass: intOrNull(form, "defaultWeightClass"),
  };
}

export async function createUser(locale: string, form: FormData) {
  await requireAdmin(locale);
  const user = buildUserData(form);
  if (!user.email || !user.firstName || !user.lastName) {
    throw new Error("email, firstName, lastName required");
  }
  const profile = await buildProfileData(form);
  const created = await prisma.user.create({
    data: { ...user, profile: { create: profile } },
  });
  revalidatePath(`/${locale}/admin/users`);
  redirect(`/${locale}/admin/users/${created.id}`);
}

export async function updateUser(locale: string, id: string, form: FormData) {
  await requireAdmin(locale);
  const user = buildUserData(form);
  if (!user.email || !user.firstName || !user.lastName) {
    throw new Error("email, firstName, lastName required");
  }
  const profile = await buildProfileData(form);
  await prisma.user.update({
    where: { id },
    data: {
      ...user,
      profile: { upsert: { create: profile, update: profile } },
    },
  });
  revalidatePath(`/${locale}/admin/users`);
  revalidatePath(`/${locale}/admin/users/${id}`);
  redirect(`/${locale}/admin/users/${id}`);
}

export async function deleteUser(locale: string, id: string) {
  await requireAdmin(locale);
  await prisma.user.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/users`);
  redirect(`/${locale}/admin/users`);
}

// ---------------------------------------------------------------------------
// Guardianship overrides (admin-only). Auth check via requireAdmin() lands in
// the deployment-and-auth Phase 1E pass (task #9); for now these actions trust
// the admin layout guard plus the upcoming real-auth wiring.
// See docs/guardianship.md §6.5.
// ---------------------------------------------------------------------------

const RELATIONS = ["PARENT", "LEGAL_GUARDIAN", "OTHER"] as const;

/**
 * Link two existing users in a guardian→dependent relationship. Used by admin
 * when the parent self-service flow doesn't apply: adding a second guardian
 * to an existing dependent, linking a coach as an OTHER-relation guardian, etc.
 */
export async function adminLinkGuardianship(
  locale: string,
  centerUserId: string,
  form: FormData,
) {
  await requireAdmin(locale);
  const role = (form.get("role") ?? "") as string; // "addGuardian" | "addDependent"
  const otherId = ((form.get("otherUserId") ?? "") as string).trim();
  const relationRaw = ((form.get("relation") ?? "PARENT") as string).trim();
  const relation =
    (RELATIONS as readonly string[]).includes(relationRaw)
      ? (relationRaw as GuardianshipRelation)
      : "PARENT";

  if (!otherId) throw new Error("otherUserId required");
  if (otherId === centerUserId) throw new Error("A user cannot guardian themselves");

  // Resolve which side is guardian and which is dependent based on the role
  // the admin picked. Always create from the perspective of the centre user.
  const guardianId = role === "addGuardian" ? otherId : centerUserId;
  const dependentId = role === "addGuardian" ? centerUserId : otherId;

  // Confirm both rows exist before writing.
  const [g, d] = await Promise.all([
    prisma.user.findUnique({ where: { id: guardianId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: dependentId }, select: { id: true } }),
  ]);
  if (!g || !d) throw new Error("User not found");

  if (await wouldFormCycle(guardianId, dependentId)) {
    throw new Error("This link would create a guardianship cycle");
  }

  const actor = await getCurrentUser();

  await prisma.guardianship.upsert({
    where: { guardianId_dependentId: { guardianId, dependentId } },
    create: {
      guardianId,
      dependentId,
      relation,
      status: "ACTIVE",
      createdById: actor?.id ?? null,
    },
    update: {
      relation,
      status: "ACTIVE",
      revokedAt: null,
      revokedById: null,
    },
  });

  revalidatePath(`/${locale}/admin/users/${centerUserId}`);
}

export async function adminRevokeGuardianship(
  locale: string,
  centerUserId: string,
  form: FormData,
) {
  await requireAdmin(locale);
  const guardianId = ((form.get("guardianId") ?? "") as string).trim();
  const dependentId = ((form.get("dependentId") ?? "") as string).trim();
  if (!guardianId || !dependentId) throw new Error("Missing ids");

  const actor = await getCurrentUser();

  await prisma.guardianship.update({
    where: { guardianId_dependentId: { guardianId, dependentId } },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedById: actor?.id ?? null,
    },
  });

  revalidatePath(`/${locale}/admin/users/${centerUserId}`);
}

export async function adminRestoreGuardianship(
  locale: string,
  centerUserId: string,
  form: FormData,
) {
  await requireAdmin(locale);
  const guardianId = ((form.get("guardianId") ?? "") as string).trim();
  const dependentId = ((form.get("dependentId") ?? "") as string).trim();
  if (!guardianId || !dependentId) throw new Error("Missing ids");

  if (await wouldFormCycle(guardianId, dependentId)) {
    throw new Error("Restoring this link would create a guardianship cycle");
  }

  await prisma.guardianship.update({
    where: { guardianId_dependentId: { guardianId, dependentId } },
    data: {
      status: "ACTIVE",
      revokedAt: null,
      revokedById: null,
    },
  });

  revalidatePath(`/${locale}/admin/users/${centerUserId}`);
}

/**
 * Flip UserProfile.active back to true on a soft-deleted user. Used together
 * with adminRestoreGuardianship when the profile was deactivated as a side
 * effect of the last guardian revoking.
 */
export async function adminReactivateUser(locale: string, userId: string) {
  await requireAdmin(locale);
  await prisma.userProfile.update({
    where: { userId },
    data: { active: true },
  });
  revalidatePath(`/${locale}/admin/users/${userId}`);
}
