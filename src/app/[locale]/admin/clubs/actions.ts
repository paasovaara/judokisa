"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

function str(form: FormData, key: string): string {
  return ((form.get(key) ?? "") as string).trim();
}

function strOrNull(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

function buildData(form: FormData) {
  const displayName = str(form, "displayName");
  if (!displayName) throw new Error("displayName is required");
  return {
    displayName,
    country: str(form, "country") || "FIN",
    suomiSportName: strOrNull(form, "suomiSportName"),
  };
}

export async function createClub(locale: string, form: FormData) {
  await requireAdmin(locale);
  const data = buildData(form);
  const created = await prisma.club.create({ data });
  revalidatePath(`/${locale}/admin/clubs`);
  redirect(`/${locale}/admin/clubs/${created.id}`);
}

export async function updateClub(locale: string, id: string, form: FormData) {
  await requireAdmin(locale);
  const data = buildData(form);
  await prisma.club.update({ where: { id }, data });
  revalidatePath(`/${locale}/admin/clubs`);
  revalidatePath(`/${locale}/admin/clubs/${id}`);
  redirect(`/${locale}/admin/clubs/${id}`);
}

export async function deleteClub(locale: string, id: string) {
  await requireAdmin(locale);
  await prisma.club.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/clubs`);
  redirect(`/${locale}/admin/clubs`);
}
