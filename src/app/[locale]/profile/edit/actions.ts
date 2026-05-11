"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GeographicArea, JudoGrade } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/session";

const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"] as const;
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"] as const;

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

// Whitelist of fields the user is allowed to edit on their own profile.
// Anything else on the form is dropped — roles, license level, status flags,
// suomi-sport IDs etc. stay admin-controlled.
export async function updateOwnProfile(locale: string, form: FormData) {
  const user = await requireCurrentUser(locale);

  const data = {
    phone: strOrNull(form, "phone"),
    dateOfBirth: dateOrNull(form, "dateOfBirth"),
    address: strOrNull(form, "address"),
    club: strOrNull(form, "club"),
    geographicArea: pickEnum(AREAS, str(form, "geographicArea")) as GeographicArea | null,
    judoGrade: pickEnum(GRADES, str(form, "judoGrade")) as JudoGrade | null,
    profilePhoto: strOrNull(form, "profilePhoto"),
    defaultCategoryCode: strOrNull(form, "defaultCategoryCode"),
    defaultWeightClass: intOrNull(form, "defaultWeightClass"),
    gdprNoSync: bool(form, "gdprNoSync"),
  };

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/profile/edit`);
  redirect(`/${locale}/profile`);
}
