"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { CategoryGender } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

const GENDERS = ["MEN", "WOMEN", "BOTH"] as const;

function parseWeightClasses(raw: string): number[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s.replace(/^\+/, ""), 10))
    .filter((n) => !isNaN(n));
}

function pickGender(raw: string): CategoryGender {
  return (GENDERS as readonly string[]).includes(raw) ? (raw as CategoryGender) : "BOTH";
}

export async function createCategory(locale: string, competitionId: string, form: FormData) {
  const code = ((form.get("code") ?? "") as string).trim();
  const nameEn = ((form.get("nameEn") ?? "") as string).trim();
  const nameFi = ((form.get("nameFi") ?? "") as string).trim();
  if (!code || !nameEn || !nameFi) throw new Error("code, nameEn, nameFi required");

  await prisma.competitionCategory.create({
    data: {
      competitionId,
      code,
      nameEn,
      nameFi,
      minAge: parseInt((form.get("minAge") as string) || "0", 10) || 0,
      maxAge: parseInt((form.get("maxAge") as string) || "0", 10) || 0,
      gender: pickGender((form.get("gender") as string) ?? ""),
      weightClasses: parseWeightClasses((form.get("weightClasses") as string) ?? ""),
    },
  });

  revalidatePath(`/${locale}/admin/competitions/${competitionId}/categories`);
}

export async function updateCategory(locale: string, competitionId: string, id: string, form: FormData) {
  await prisma.competitionCategory.update({
    where: { id },
    data: {
      code: ((form.get("code") ?? "") as string).trim(),
      nameEn: ((form.get("nameEn") ?? "") as string).trim(),
      nameFi: ((form.get("nameFi") ?? "") as string).trim(),
      minAge: parseInt((form.get("minAge") as string) || "0", 10) || 0,
      maxAge: parseInt((form.get("maxAge") as string) || "0", 10) || 0,
      gender: pickGender((form.get("gender") as string) ?? ""),
      weightClasses: parseWeightClasses((form.get("weightClasses") as string) ?? ""),
    },
  });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/categories`);
}

export async function deleteCategory(locale: string, competitionId: string, id: string) {
  await prisma.competitionCategory.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/categories`);
}

export async function seedDefaultCategories(locale: string, competitionId: string) {
  // Only adds categories whose code does not already exist for this competition.
  const existing = await prisma.competitionCategory.findMany({
    where: { competitionId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((c) => c.code));
  const toCreate = DEFAULT_CATEGORIES
    .filter((d) => !existingCodes.has(d.code))
    .map((d) => ({ ...d, competitionId }));
  if (toCreate.length > 0) {
    await prisma.competitionCategory.createMany({ data: toCreate });
  }
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/categories`);
}
