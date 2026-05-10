"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { CategoryGender } from "@prisma/client";

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

// Default category set from docs/requirements.md §3
const DEFAULTS = [
  { code: "M",   nameEn: "Men",       nameFi: "Miehet",     minAge: 18, maxAge: 0,  gender: "MEN" as const,   weightClasses: [-60, -66, -73, -81, -90, -100, 100] },
  { code: "M21", nameEn: "U21 men",   nameFi: "U21 miehet", minAge: 18, maxAge: 21, gender: "MEN" as const,   weightClasses: [-55, -60, -66, -73, -81, -90, 90] },
  { code: "P18", nameEn: "U18 boys",  nameFi: "U18 pojat",  minAge: 15, maxAge: 18, gender: "MEN" as const,   weightClasses: [-45, -50, -60, -66, -73, -81, 81] },
  { code: "P15", nameEn: "U15 boys",  nameFi: "U15 pojat",  minAge: 13, maxAge: 15, gender: "MEN" as const,   weightClasses: [-34, -38, -42, -46, -50, -55, -60, -66, 66] },
  { code: "P13", nameEn: "U13 boys",  nameFi: "U13 pojat",  minAge: 11, maxAge: 13, gender: "MEN" as const,   weightClasses: [-30, -34, -38, -42, -46, -50, -55, 55] },
  { code: "P11", nameEn: "U11 boys",  nameFi: "U11 pojat",  minAge: 9,  maxAge: 11, gender: "MEN" as const,   weightClasses: [-27, -30, -34, -38, -42, -46, -50, -55, 55] },
  { code: "N",   nameEn: "Women",     nameFi: "Naiset",     minAge: 18, maxAge: 0,  gender: "WOMEN" as const, weightClasses: [-48, -52, -57, -63, -70, -78, 78] },
  { code: "N21", nameEn: "U21 women", nameFi: "U21 naiset", minAge: 15, maxAge: 21, gender: "WOMEN" as const, weightClasses: [-48, -52, -57, -63, -70, 70] },
  { code: "T18", nameEn: "U18 girls", nameFi: "U18 tytöt",  minAge: 15, maxAge: 18, gender: "WOMEN" as const, weightClasses: [-44, -48, -52, -57, -63, 63] },
  { code: "T15", nameEn: "U15 girls", nameFi: "U15 tytöt",  minAge: 13, maxAge: 15, gender: "WOMEN" as const, weightClasses: [-32, -36, -40, -44, -48, -52, -57, -63, 63] },
  { code: "T13", nameEn: "U13 girls", nameFi: "U13 tytöt",  minAge: 11, maxAge: 13, gender: "WOMEN" as const, weightClasses: [-28, -32, -36, -40, -44, -48, -52, 52] },
  { code: "T11", nameEn: "U11 girls", nameFi: "U11 tytöt",  minAge: 9,  maxAge: 11, gender: "WOMEN" as const, weightClasses: [-25, -28, -32, -36, -40, -44, -48, -52, 52] },
];

export async function seedDefaultCategories(locale: string, competitionId: string) {
  // Only adds categories whose code does not already exist for this competition.
  const existing = await prisma.competitionCategory.findMany({
    where: { competitionId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((c) => c.code));
  const toCreate = DEFAULTS
    .filter((d) => !existingCodes.has(d.code))
    .map((d) => ({ ...d, competitionId }));
  if (toCreate.length > 0) {
    await prisma.competitionCategory.createMany({ data: toCreate });
  }
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/categories`);
}
