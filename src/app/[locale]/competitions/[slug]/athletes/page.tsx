import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import CompetitorTable from "@/components/CompetitorTable";

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
          select: {
            id: true,
            name: true,
            club: true,
            country: true,
            beltRank: true,
            birthYear: true,
            weightCategory: true,
            ageCategory: true,
          },
        },
        results: {
          select: {
            athleteName: true,
            club: true,
            weightCategory: true,
            ageCategory: true,
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

  if (data.competitors.length > 0) {
    return (
      <div>
        <p className="mb-4 text-sm text-gray-500">
          {data.competitors.length} {locale === "fi" ? "kilpailijaa" : "athletes"}
        </p>
        <CompetitorTable competitors={data.competitors} locale={locale} />
      </div>
    );
  }

  // Completed competition with no competitor records — derive from results
  if (data.status === "COMPLETED" && data.results.length > 0) {
    const competitors = data.results.map((r, i) => ({
      id: String(i),
      name: r.athleteName,
      club: r.club,
      country: null,
      beltRank: null,
      birthYear: null,
      weightCategory: r.weightCategory,
      ageCategory: r.ageCategory,
    }));

    return (
      <div>
        <p className="mb-4 text-sm text-gray-500">
          {new Set(competitors.map((c) => c.name)).size}{" "}
          {locale === "fi" ? "kilpailijaa" : "athletes"}
        </p>
        <CompetitorTable competitors={competitors} locale={locale} />
      </div>
    );
  }

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
