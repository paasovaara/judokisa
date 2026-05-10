"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { GeographicArea, JudoGrade, RefereeLicenseLevel } from "@prisma/client";

const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"] as const;
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"] as const;
const LICENSES = ["D", "C", "B", "A", "INT_B", "INT_A"] as const;

const ROLE_KEYS = [
  "isReferee", "isAdministrator", "isCommission", "isCoordinator",
  "isCompetitionManager", "isCompetitionAssistant", "isCompetitionResponsible",
  "isCourseInstructor", "isJudoShiaiOperator", "isVideoOperator",
] as const;

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

function buildProfileData(form: FormData) {
  const area = pickEnum(AREAS, str(form, "geographicArea"));
  const grade = pickEnum(GRADES, str(form, "judoGrade"));
  const license = pickEnum(LICENSES, str(form, "refereeLicenseLevel"));

  const roles = Object.fromEntries(
    ROLE_KEYS.map((k) => [k, bool(form, k)]),
  ) as Record<typeof ROLE_KEYS[number], boolean>;

  // Always treat the referees-admin form as creating/editing referees → default isReferee true
  if (!roles.isReferee && bool(form, "_defaultReferee")) {
    roles.isReferee = true;
  }

  return {
    ...roles,
    phone: strOrNull(form, "phone"),
    address: strOrNull(form, "address"),
    club: strOrNull(form, "club"),
    geographicArea: area as GeographicArea | null,
    judoGrade: grade as JudoGrade | null,
    refereeLicenseLevel: license as RefereeLicenseLevel | null,
    active: !bool(form, "_inactive"),
    blacklisted: bool(form, "blacklisted"),
    gdprNoSync: bool(form, "gdprNoSync"),
  };
}

export async function createReferee(locale: string, form: FormData) {
  const user = buildUserData(form);
  if (!user.email || !user.firstName || !user.lastName) {
    throw new Error("email, firstName, lastName required");
  }
  const profile = buildProfileData(form);
  const created = await prisma.user.create({
    data: {
      ...user,
      profile: { create: { ...profile, isReferee: profile.isReferee || true } },
    },
  });
  revalidatePath(`/${locale}/admin/referees`);
  redirect(`/${locale}/admin/referees/${created.id}`);
}

export async function updateReferee(locale: string, id: string, form: FormData) {
  const user = buildUserData(form);
  const profile = buildProfileData(form);
  await prisma.user.update({
    where: { id },
    data: {
      ...user,
      profile: {
        upsert: {
          create: profile,
          update: profile,
        },
      },
    },
  });
  revalidatePath(`/${locale}/admin/referees`);
  revalidatePath(`/${locale}/admin/referees/${id}`);
  redirect(`/${locale}/admin/referees/${id}`);
}

export async function deleteReferee(locale: string, id: string) {
  await prisma.user.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/referees`);
  redirect(`/${locale}/admin/referees`);
}
