"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
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

function buildData(form: FormData) {
  const gender = pickEnum(GENDERS, str(form, "gender")) ?? "UNKNOWN";
  const grade = pickEnum(GRADES, str(form, "judoGrade"));
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
  };
}

async function recountRegistered(competitionId: string) {
  const count = await prisma.competitor.count({ where: { competitionId, removed: false } });
  await prisma.competition.update({ where: { id: competitionId }, data: { registeredCount: count } });
}

export async function createCompetitor(locale: string, competitionId: string, form: FormData) {
  const data = buildData(form);
  if (!data.firstName || !data.lastName) throw new Error("firstName and lastName required");
  await prisma.competitor.create({ data: { ...data, competitionId } });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function updateCompetitor(locale: string, competitionId: string, id: string, form: FormData) {
  const data = buildData(form);
  await prisma.competitor.update({ where: { id }, data });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function softDeleteCompetitor(locale: string, competitionId: string, id: string) {
  await prisma.competitor.update({ where: { id }, data: { removed: true } });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function restoreCompetitor(locale: string, competitionId: string, id: string) {
  await prisma.competitor.update({ where: { id }, data: { removed: false } });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}

export async function hardDeleteCompetitor(locale: string, competitionId: string, id: string) {
  await prisma.competitor.delete({ where: { id } });
  await recountRegistered(competitionId);
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/competitors`);
}
