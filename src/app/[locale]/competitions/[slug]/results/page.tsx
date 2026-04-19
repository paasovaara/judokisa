"use client";

import { useTranslations } from "next-intl";
import { useCompetitionTabs } from "@/components/CompetitionTabsProvider";
import ResultsTable from "@/components/ResultsTable";
import type { ResultItem } from "@/lib/competitionTabCache";

export default function CompetitionResultsPage() {
  const { data } = useCompetitionTabs();
  const t = useTranslations("competition");

  if (!data) {
    return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (data.status !== "COMPLETED" || data.results.length === 0) {
    return <p className="text-sm text-gray-500">{t("no_results")}</p>;
  }

  const byCategory = data.results.reduce(
    (acc: Record<string, ResultItem[]>, r: ResultItem) => {
      const key = `${r.ageCategory ?? ""} ${r.weightCategory}`.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {},
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.entries(byCategory) as [string, ResultItem[]][]).map(([category, results]) => (
        <div key={category} className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary">{category}</h3>
          <ResultsTable results={results} />
        </div>
      ))}
    </div>
  );
}
