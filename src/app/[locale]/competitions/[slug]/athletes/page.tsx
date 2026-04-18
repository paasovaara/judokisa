import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function CompetitionAthletesPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

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
          select: {
            athleteName: true,
            club: true,
            weightCategory: true,
            ageCategory: true,
            gender: true,
          },
          orderBy: [{ weightCategory: "asc" }, { athleteName: "asc" }],
        },
      },
    });
  } catch {
    data = null;
  }

  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });

  // For completed competitions with no competitors scraped, fall back to results
  const isCompleted = data.status === "COMPLETED";
  const useCompetitors = data.competitors.length > 0;
  const useResults = isCompleted && data.results.length > 0 && !useCompetitors;

  if (useCompetitors) {
    type CompetitorRow = (typeof data.competitors)[number];
    const byCategory = data.competitors.reduce(
      (acc: Record<string, CompetitorRow[]>, c: CompetitorRow) => {
        const key = `${c.ageCategory ?? ""} ${c.weightCategory}`.trim();
        if (!acc[key]) acc[key] = [];
        acc[key].push(c);
        return acc;
      },
      {},
    );

    return (
      <div>
        <p className="mb-6 text-sm text-gray-500">
          {data.competitors.length} {locale === "fi" ? "kilpailijaa" : "athletes"}
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(byCategory) as [string, CompetitorRow[]][]).map(([category, rows]) => (
            <div key={category} className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">{category}</h3>
              <ul className="space-y-1.5">
                {rows.map((c) => (
                  <li key={c.id} className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {[c.club, c.country].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (useResults) {
    type ResultRow = (typeof data.results)[number];
    const byCategory = data.results.reduce(
      (acc: Record<string, ResultRow[]>, r: ResultRow) => {
        const key = `${r.ageCategory ?? ""} ${r.weightCategory}`.trim();
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
      },
      {},
    );

    const uniqueCount = new Set(data.results.map((r) => r.athleteName)).size;

    return (
      <div>
        <p className="mb-6 text-sm text-gray-500">
          {uniqueCount} {locale === "fi" ? "kilpailijaa" : "athletes"}
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(byCategory) as [string, ResultRow[]][]).map(([category, rows]) => (
            <div key={category} className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">{category}</h3>
              <ul className="space-y-1.5">
                {rows.map((r, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">{r.athleteName}</span>
                    {r.club && <span className="text-xs text-gray-400 truncate">{r.club}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No competitor or result data yet
  return (
    <div className="space-y-4">
      {data.registeredCount > 0 && (
        <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <span className="text-3xl font-bold text-primary">{data.registeredCount}</span>
          <span className="text-sm text-gray-600">
            {t("registered_count")}
            {data.capacity != null && (
              <span className="text-gray-400"> / {data.capacity}</span>
            )}
          </span>
        </div>
      )}
      <p className="text-sm text-gray-500">{t("no_athletes")}</p>
    </div>
  );
}
