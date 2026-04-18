import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ResultsTable from "@/components/ResultsTable";

export default async function CompetitionResultsPage({
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
        results: {
          orderBy: [{ weightCategory: "asc" }, { placement: "asc" }],
        },
      },
    });
  } catch {
    data = null;
  }

  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });

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

  if (data.status !== "COMPLETED" || data.results.length === 0) {
    return <p className="text-sm text-gray-500">{t("no_results")}</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.entries(byCategory) as [string, ResultRow[]][]).map(([category, results]) => (
        <div key={category} className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary">{category}</h3>
          <ResultsTable results={results} />
        </div>
      ))}
    </div>
  );
}
