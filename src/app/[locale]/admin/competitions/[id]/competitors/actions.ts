"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/session";
import type { Gender, JudoGrade } from "@prisma/client";

const GENDERS = ["MALE", "FEMALE", "UNKNOWN"] as const;
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"] as const;

function str(form: FormData, key: string): string {
  return ((form.get(key) ?? "") as string).trim();
}
function strOrNull(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}
function intOrNull(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (!v) return null;
  const n = parseInt(v.replace(/^\+/, ""), 10);
  return isNaN(n) ? null : n;
}

function pickEnum<T extends readonly string[]>(values: T, raw: string): T[number] | null {
  return (values as readonly string[]).includes(raw) ? (raw as T[number]) : null;
}

// Validate that an FK candidate references an actual User row before we
// stamp it onto Competitor. A hand-crafted POST otherwise could break the FK.
async function validateUserId(raw: string | null): Promise<string | null> {
  if (!raw) return null;
  const u = await prisma.user.findUnique({ where: { id: raw }, select: { id: true } });
  return u?.id ?? null;
}

async function buildData(form: FormData) {
  const gender = pickEnum(GENDERS, str(form, "gender")) ?? "UNKNOWN";
  const grade = pickEnum(GRADES, str(form, "judoGrade"));
  const athleteId = await validateUserId(strOrNull(form, "athleteId"));
  return {
    firstName: str(form, "firstName"),
    lastName: str(form, "lastName"),
    phone: strOrNull(form, "phone"),
    email: strOrNull(form, "email"),
    yearOfBirth: intOrNull(form, "yearOfBirth"),
    gender: gender as Gender,
    country: str(form, "country") || "FIN",
    clubId: strOrNull(form, "clubId"),
    clubName: strOrNull(form, "clubName"),
    categoryId: strOrNull(form, "categoryId"),
    weightClass: intOrNull(form, "weightClass"),
    judoGrade: grade as JudoGrade | null,
    athleteId,
  };
}

async function recountRegistered(competitionId: string) {
  const count = await prisma.competitor.count({ where: { competitionId, removed: false } });
  await prisma.competition.update({ where: { id: competitionId }, data: { registeredCount: count } });
}

export async function createCompetitor(locale: string, competitionId: string, form: FormData) {
  await requireAdmin(locale);
  const data = await buildData(form);
  if (!data.firstName || !data.lastName) throw new Error("firstName and lastName required");
  // Stamp the actor as registeredById so /profile/history/registrations and
  // future admin reports can attribute the entry.
  const actor = await getCurrentUser();
  await prisma.competitor.create({
    data: { ...data, competitionId, registeredById: actor?.id ?? null },
  });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function updateCompetitor(locale: string, competitionId: string, id: string, form: FormData) {
  await requireAdmin(locale);
  const data = await buildData(form);
  // Keep registeredById stable across edits — it records who first entered
  // the competitor, not who last touched the row.
  await prisma.competitor.update({ where: { id }, data });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function softDeleteCompetitor(locale: string, competitionId: string, id: string) {
  await requireAdmin(locale);
  await prisma.competitor.update({ where: { id }, data: { removed: true } });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function restoreCompetitor(locale: string, competitionId: string, id: string) {
  await requireAdmin(locale);
  await prisma.competitor.update({ where: { id }, data: { removed: false } });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function hardDeleteCompetitor(locale: string, competitionId: string, id: string) {
  await requireAdmin(locale);
  await prisma.competitor.delete({ where: { id } });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}
