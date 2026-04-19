import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let data;
  try {
    data = await prisma.competition.findUnique({
      where: { slug },
      select: {
        status: true,
        registeredCount: true,
        capacity: true,
        competitors: {
          orderBy: [{ weightCategory: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            club: true,
            country: true,
            beltRank: true,
            birthYear: true,
            weightCategory: true,
            ageCategory: true,
            gender: true,
          },
        },
        results: {
          orderBy: [{ weightCategory: "asc" }, { placement: "asc" }],
        },
        matches: {
          orderBy: [{ weightCategory: "asc" }, { round: "asc" }],
        },
        videoFeeds: {
          orderBy: { name: "asc" },
        },
      },
    });
  } catch (err) {
    console.error(`[tabs API] DB error for slug "${slug}":`, err);
    return NextResponse.json({ error: "Database error" }, { status: 503 });
  }

  if (!data) {
    console.warn(`[tabs API] competition not found for slug "${slug}"`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
