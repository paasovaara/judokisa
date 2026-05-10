import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { TabData } from "@/lib/competitionTabCache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let competition;
  try {
    competition = await prisma.competition.findUnique({
      where: { slug },
      select: {
        status: true,
        registeredCount: true,
        capacity: true,
        competitors: {
          where: { removed: false },
          orderBy: [{ weightClass: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            country: true,
            judoGrade: true,
            yearOfBirth: true,
            weightClass: true,
            gender: true,
            clubName: true,
            club: { select: { displayName: true } },
            category: { select: { id: true, code: true, nameEn: true, nameFi: true } },
          },
        },
        results: {
          orderBy: [{ weightClass: "asc" }, { placement: "asc" }],
          select: {
            id: true,
            competitionId: true,
            firstName: true,
            lastName: true,
            country: true,
            weightClass: true,
            ageCategory: true,
            gender: true,
            placement: true,
            createdAt: true,
            clubName: true,
            club: { select: { displayName: true } },
            category: { select: { id: true, code: true, nameEn: true, nameFi: true } },
          },
        },
        matches: {
          orderBy: [{ weightClass: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            competitionId: true,
            athlete1First: true,
            athlete1Last: true,
            athlete2First: true,
            athlete2Last: true,
            athlete1Club: true,
            athlete2Club: true,
            athlete1Score: true,
            athlete2Score: true,
            winnerSide: true,
            weightClass: true,
            gender: true,
            createdAt: true,
            category: { select: { id: true, code: true, nameEn: true, nameFi: true } },
          },
        },
        videoFeeds: {
          orderBy: [{ tatamiNumber: "asc" }, { name: "asc" }],
          select: { id: true, name: true, tatamiNumber: true, url: true },
        },
      },
    });
  } catch (err) {
    console.error(`[tabs API] DB error for slug "${slug}":`, err);
    return NextResponse.json({ error: "Database error" }, { status: 503 });
  }

  if (!competition) {
    console.warn(`[tabs API] competition not found for slug "${slug}"`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: TabData = {
    status: competition.status,
    registeredCount: competition.registeredCount,
    capacity: competition.capacity,
    competitors: competition.competitors.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      clubName: c.club?.displayName ?? c.clubName ?? null,
      country: c.country,
      judoGrade: c.judoGrade,
      yearOfBirth: c.yearOfBirth,
      weightClass: c.weightClass,
      category: c.category,
      gender: c.gender,
    })),
    results: competition.results.map((r) => ({
      id: r.id,
      competitionId: r.competitionId,
      firstName: r.firstName,
      lastName: r.lastName,
      clubName: r.club?.displayName ?? r.clubName ?? null,
      country: r.country,
      weightClass: r.weightClass,
      ageCategory: r.ageCategory,
      category: r.category,
      gender: r.gender,
      placement: r.placement,
      createdAt: r.createdAt.toISOString(),
    })),
    matches: competition.matches.map((m) => ({
      id: m.id,
      competitionId: m.competitionId,
      athlete1First: m.athlete1First,
      athlete1Last: m.athlete1Last,
      athlete2First: m.athlete2First,
      athlete2Last: m.athlete2Last,
      athlete1Club: m.athlete1Club,
      athlete2Club: m.athlete2Club,
      athlete1Score: m.athlete1Score,
      athlete2Score: m.athlete2Score,
      winnerSide: m.winnerSide,
      weightClass: m.weightClass,
      category: m.category,
      gender: m.gender,
      createdAt: m.createdAt.toISOString(),
    })),
    videoFeeds: competition.videoFeeds.map((v) => ({
      id: v.id,
      name: v.name,
      tatamiNumber: v.tatamiNumber,
      url: v.url,
    })),
  };

  return NextResponse.json(data);
}
