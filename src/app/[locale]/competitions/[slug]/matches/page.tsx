"use client";

import { useTranslations } from "next-intl";
import { use } from "react";
import { useCompetitionTabs } from "@/components/CompetitionTabsProvider";
import { fullName, weightClassLabel } from "@/lib/format";

export default function CompetitionMatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const { data } = useCompetitionTabs();
  const t = useTranslations("competition");

  if (!data) {
    return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (data.matches.length === 0) {
    return <p className="text-sm text-gray-500">{t("no_matches")}</p>;
  }

  const isFi = locale === "fi";

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2.5 pl-4 pr-3">{isFi ? "Sarja" : "Category"}</th>
            <th className="py-2.5 pr-3">{isFi ? "Ottelu" : "Match"}</th>
            <th className="py-2.5 pr-4">{isFi ? "Tulos" : "Score"}</th>
          </tr>
        </thead>
        <tbody>
          {data.matches.map((m) => {
            const a1 = fullName(m.athlete1First, m.athlete1Last);
            const a2 = fullName(m.athlete2First, m.athlete2Last);
            const categoryLabel =
              [m.category ? (isFi ? m.category.nameFi : m.category.nameEn) : "", weightClassLabel(m.weightClass)]
                .filter(Boolean)
                .join(" ");
            return (
              <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-2.5 pl-4 pr-3 text-xs text-gray-500">{categoryLabel || "–"}</td>
                <td className="py-2.5 pr-3">
                  <span className={m.winnerSide === 1 ? "font-semibold text-gray-900" : "text-gray-600"}>
                    {a1}
                  </span>
                  <span className="mx-2 text-gray-400">vs</span>
                  <span className={m.winnerSide === 2 ? "font-semibold text-gray-900" : "text-gray-600"}>
                    {a2}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-gray-600">
                  {m.athlete1Score != null && m.athlete2Score != null
                    ? `${m.athlete1Score}–${m.athlete2Score}`
                    : "–"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
