"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type {
  CompetitionType,
  CompetitionLevel,
  CompetitionStatus,
  GeographicArea,
} from "@prisma/client";

const TYPES = ["TOURNAMENT", "CHAMPIONSHIP", "KATA", "CAMP", "OPEN", "INTERNATIONAL"] as const;
const LEVELS = ["SM", "NSM", "SC", "FJO", "KV", "STARTTI_CUP", "KATA", "TEAM", "MUU"] as const;
const STATUSES = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"] as const;
const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"] as const;

function str(form: FormData, key: string): string {
  return ((form.get(key) ?? "") as string).trim();
}

function strOrNull(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v === "" ? null : v;
}

function intOrNull(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === "") return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function dateOrNull(form: FormData, key: string): Date | null {
  const v = str(form, key);
  if (!v) return null;
  const d = new Date(v + "T12:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

function pickEnum<T extends readonly string[]>(values: T, raw: string): T[number] | null {
  return (values as readonly string[]).includes(raw) ? (raw as T[number]) : null;
}

function buildData(form: FormData) {
  const dateStart = dateOrNull(form, "dateStart");
  const dateEnd = dateOrNull(form, "dateEnd");
  if (!dateStart || !dateEnd) {
    throw new Error("dateStart and dateEnd are required");
  }
  const type = pickEnum(TYPES, str(form, "type"));
  if (!type) throw new Error("invalid type");
  const status = pickEnum(STATUSES, str(form, "status")) ?? "UPCOMING";
  const level = pickEnum(LEVELS, str(form, "level"));
  const area = pickEnum(AREAS, str(form, "geographicArea"));

  return {
    name: str(form, "name"),
    slug: str(form, "slug"),
    type: type as CompetitionType,
    level: level as CompetitionLevel | null,
    status: status as CompetitionStatus,
    registrationOpen: bool(form, "registrationOpen"),
    dateStart,
    dateEnd,
    registrationDeadline: dateOrNull(form, "registrationDeadline"),
    city: str(form, "city"),
    venue: strOrNull(form, "venue"),
    address: strOrNull(form, "address"),
    country: str(form, "country") || "FI",
    geographicArea: area as GeographicArea | null,
    capacity: intOrNull(form, "capacity"),
    numberOfTatamiMats: intOrNull(form, "numberOfTatamiMats") ?? 3,
    targetRefereeCount: intOrNull(form, "targetRefereeCount") ?? 0,
    matchDurationMinutes: intOrNull(form, "matchDurationMinutes") ?? 7,
    useCustomVideoHtml: bool(form, "useCustomVideoHtml"),
    description: strOrNull(form, "description"),
    registrationUrl: strOrNull(form, "registrationUrl"),
    infoUrl: strOrNull(form, "infoUrl"),
    resultsUrl: strOrNull(form, "resultsUrl"),
  };
}

export async function createCompetition(locale: string, form: FormData) {
  await requireAdmin(locale);
  const data = buildData(form);
  const created = await prisma.competition.create({ data });
  revalidatePath(`/${locale}/admin/competitions`);
  redirect(`/${locale}/admin/competitions/${created.id}`);
}

export async function updateCompetition(locale: string, id: string, form: FormData) {
  await requireAdmin(locale);
  const data = buildData(form);
  await prisma.competition.update({ where: { id }, data });
  revalidatePath(`/${locale}/admin/competitions`);
  revalidatePath(`/${locale}/admin/competitions/${id}`);
  revalidatePath(`/${locale}/competitions/${data.slug}`);
  redirect(`/${locale}/admin/competitions/${id}`);
}

export async function deleteCompetition(locale: string, id: string) {
  await requireAdmin(locale);
  await prisma.competition.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/competitions`);
  redirect(`/${locale}/admin/competitions`);
}
