"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { GeographicArea, JudoGrade, RefereeLicenseLevel } from "@prisma/client";
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

function buildProfileData(form: FormData) {
  const area = pickEnum(AREAS, str(form, "geographicArea"));
  const grade = pickEnum(GRADES, str(form, "judoGrade"));
  const license = pickEnum(LICENSES, str(form, "refereeLicenseLevel"));

  const roles = Object.fromEntries(
    ROLE_KEYS.map((k) => [k, bool(form, k)]),
  ) as Record<RoleKey, boolean>;

  return {
    ...roles,
    phone: strOrNull(form, "phone"),
    dateOfBirth: dateOrNull(form, "dateOfBirth"),
    address: strOrNull(form, "address"),
    club: strOrNull(form, "club"),
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
  const user = buildUserData(form);
  if (!user.email || !user.firstName || !user.lastName) {
    throw new Error("email, firstName, lastName required");
  }
  const profile = buildProfileData(form);
  const created = await prisma.user.create({
    data: { ...user, profile: { create: profile } },
  });
  revalidatePath(`/${locale}/admin/users`);
  redirect(`/${locale}/admin/users/${created.id}`);
}

export async function updateUser(locale: string, id: string, form: FormData) {
  const user = buildUserData(form);
  if (!user.email || !user.firstName || !user.lastName) {
    throw new Error("email, firstName, lastName required");
  }
  const profile = buildProfileData(form);
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
  await prisma.user.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/users`);
  redirect(`/${locale}/admin/users`);
}
