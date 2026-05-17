"use server";

// Parent self-service for managing dependent (child) accounts.
// See docs/guardianship.md §5.4 for the contract. Auth model:
//   - createDependent:   any authenticated user (limited by cycle/dup guards).
//   - updateDependent:   guardian or self.
//   - softDeleteDependent / restoreDependent: guardian only (and only for
//     dependent-only targets — a child who has claimed their own login can
//     only be deactivated by themselves or an admin).
//
// TODO: rate-limit createDependent once Upstash is wired (docs/guardianship.md §5.4).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Gender, GeographicArea, GuardianshipRelation, JudoGrade } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/session";
import {
  canActAs,
  countActiveGuardiansOf,
  requireCanActAs,
  wouldFormCycle,
} from "@/lib/guardianship";

const GENDERS = ["MALE", "FEMALE", "UNKNOWN"] as const;
const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"] as const;
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"] as const;
const RELATIONS = ["PARENT", "LEGAL_GUARDIAN", "OTHER"] as const;

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

async function validateClubId(rawClubId: string | null): Promise<string | null> {
  if (!rawClubId) return null;
  const club = await prisma.club.findUnique({
    where: { id: rawClubId },
    select: { id: true },
  });
  return club?.id ?? null;
}

/**
 * Create a new dependent (child) account under the current user's guardianship.
 * Single transaction: User + UserProfile + Guardianship. Email and password
 * stay null — dependent-only accounts have no login until claimed.
 */
export async function createDependent(locale: string, form: FormData) {
  const me = await requireCurrentUser(locale);

  const firstName = str(form, "firstName");
  const lastName = str(form, "lastName");
  if (!firstName || !lastName) {
    throw new Error("First name and last name are required");
  }

  const relation =
    pickEnum(RELATIONS, str(form, "relation")) as GuardianshipRelation | null ?? "PARENT";

  const clubId = await validateClubId(strOrNull(form, "clubId"));

  const profile = {
    phone: strOrNull(form, "phone"),
    dateOfBirth: dateOrNull(form, "dateOfBirth"),
    address: strOrNull(form, "address"),
    clubId,
    geographicArea: pickEnum(AREAS, str(form, "geographicArea")) as GeographicArea | null,
    judoGrade: pickEnum(GRADES, str(form, "judoGrade")) as JudoGrade | null,
    profilePhoto: strOrNull(form, "profilePhoto"),
    defaultCategoryCode: strOrNull(form, "defaultCategoryCode"),
    defaultWeightClass: intOrNull(form, "defaultWeightClass"),
    gdprNoSync: bool(form, "gdprNoSync"),
  };

  const gender = pickEnum(GENDERS, str(form, "gender")) as Gender | null;

  // All three rows live in one transaction: the dependent exists only as part
  // of a guardianship from the start, so partial failure shouldn't leave an
  // orphan User row hanging around.
  const created = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        firstName,
        lastName,
        // Dependent-only: no auth identity and no email until claimed.
        authUserId: null,
        email: null,
        ...(gender ? {} : {}), // gender lives on Competitor/Result, not User — kept here for future
      },
      select: { id: true },
    });

    await tx.userProfile.create({
      data: {
        userId: newUser.id,
        ...profile,
      },
    });

    await tx.guardianship.create({
      data: {
        guardianId: me.id,
        dependentId: newUser.id,
        relation,
        status: "ACTIVE",
        createdById: me.id,
      },
    });

    return newUser;
  });

  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile/dependents/${created.id}`);
}

/**
 * Update a dependent's profile fields. Whitelist matches /profile/edit —
 * admin-only fields (role flags, license level, suomiSport IDs, active,
 * blacklisted) stay admin-only.
 */
export async function updateDependent(locale: string, targetUserId: string, form: FormData) {
  const me = await requireCurrentUser(locale);
  await requireCanActAs(me.id, targetUserId);

  const clubId = await validateClubId(strOrNull(form, "clubId"));

  const data = {
    phone: strOrNull(form, "phone"),
    dateOfBirth: dateOrNull(form, "dateOfBirth"),
    address: strOrNull(form, "address"),
    clubId,
    geographicArea: pickEnum(AREAS, str(form, "geographicArea")) as GeographicArea | null,
    judoGrade: pickEnum(GRADES, str(form, "judoGrade")) as JudoGrade | null,
    profilePhoto: strOrNull(form, "profilePhoto"),
    defaultCategoryCode: strOrNull(form, "defaultCategoryCode"),
    defaultWeightClass: intOrNull(form, "defaultWeightClass"),
    gdprNoSync: bool(form, "gdprNoSync"),
  };

  // Also allow updating the displayed name — parents commonly need to fix
  // a typo on a child's record they created.
  const firstName = strOrNull(form, "firstName");
  const lastName = strOrNull(form, "lastName");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      },
    }),
    prisma.userProfile.upsert({
      where: { userId: targetUserId },
      create: { userId: targetUserId, ...data },
      update: data,
    }),
  ]);

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/dependents/${targetUserId}`);
  revalidatePath(`/${locale}/profile/dependents/${targetUserId}/edit`);
  redirect(`/${locale}/profile/dependents/${targetUserId}`);
}

/**
 * Revoke the calling user's guardianship of `targetUserId`. If that was the
 * last active guardianship, also set UserProfile.active = false. Cannot be
 * used on a dependent who has claimed their own login (authUserId set) —
 * see docs/guardianship.md §5.4.
 */
export async function softDeleteDependent(locale: string, targetUserId: string) {
  const me = await requireCurrentUser(locale);
  await requireCanActAs(me.id, targetUserId);

  if (me.id === targetUserId) {
    throw new Error("Cannot soft-delete your own account here");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { authUserId: true },
  });
  if (!target) {
    throw new Error("Dependent not found");
  }
  if (target.authUserId) {
    throw new Error(
      "This account has its own login; only the user themselves or an admin can deactivate it",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.guardianship.update({
      where: {
        guardianId_dependentId: { guardianId: me.id, dependentId: targetUserId },
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById: me.id,
      },
    });

    const remaining = await tx.guardianship.count({
      where: { dependentId: targetUserId, status: "ACTIVE" },
    });
    if (remaining === 0) {
      await tx.userProfile.update({
        where: { userId: targetUserId },
        data: { active: false },
      });
    }
  });

  revalidatePath(`/${locale}/profile`);
  redirect(`/${locale}/profile`);
}

/**
 * Restore a previously soft-deleted dependent. Allowed if the caller is the
 * one who revoked the relationship and no other guardian has been added since
 * (otherwise admin path). Also re-activates the dependent's profile if it
 * was deactivated as a side-effect.
 */
export async function restoreDependent(locale: string, targetUserId: string) {
  const me = await requireCurrentUser(locale);

  const link = await prisma.guardianship.findUnique({
    where: {
      guardianId_dependentId: { guardianId: me.id, dependentId: targetUserId },
    },
    select: { status: true, revokedById: true },
  });
  if (!link) {
    throw new Error("No guardianship to restore");
  }
  if (link.status === "ACTIVE") {
    // Idempotent: nothing to do.
    revalidatePath(`/${locale}/profile`);
    return;
  }
  if (link.revokedById && link.revokedById !== me.id) {
    throw new Error("This relationship was revoked by an admin; only an admin can restore it");
  }

  // Cycle re-check in case the graph changed while the relationship was revoked.
  if (await wouldFormCycle(me.id, targetUserId)) {
    throw new Error("Restoring this relationship would create a guardianship cycle");
  }

  await prisma.$transaction(async (tx) => {
    await tx.guardianship.update({
      where: {
        guardianId_dependentId: { guardianId: me.id, dependentId: targetUserId },
      },
      data: {
        status: "ACTIVE",
        revokedAt: null,
        revokedById: null,
      },
    });

    // If the profile was deactivated when this was the sole guardianship,
    // bring it back to life. Active multi-guardian dependents stay untouched.
    const profile = await tx.userProfile.findUnique({
      where: { userId: targetUserId },
      select: { active: true },
    });
    if (profile && !profile.active) {
      await tx.userProfile.update({
        where: { userId: targetUserId },
        data: { active: true },
      });
    }
  });

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/dependents/${targetUserId}`);
  redirect(`/${locale}/profile/dependents/${targetUserId}`);
}

// Helper for the overview UI: is the caller the sole active guardian?
// Used by the Remove confirmation dialog to display the right message.
export async function isSoleActiveGuardian(currentUserId: string, dependentId: string) {
  const [iAmGuardian, total] = await Promise.all([
    canActAs(currentUserId, dependentId),
    countActiveGuardiansOf(dependentId),
  ]);
  return iAmGuardian && total === 1;
}
