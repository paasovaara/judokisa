import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { categoryDisplay } from "@/lib/format";
import { getUserResults } from "@/lib/profileHistory";

export default async function ResultsView({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "profile.history" });
  const results = await getUserResults(userId);
  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  if (results.length === 0) {
    return <p className="text-sm text-gray-500">{t("empty_results")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2.5 pl-4 pr-3">{t("col_date")}</th>
            <th className="py-2.5 pr-3">{t("col_competition")}</th>
            <th className="py-2.5 pr-3">{t("col_category")}</th>
            <th className="py-2.5 pr-4">{t("col_placement")}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const cat = r.category
              ? locale === "fi"
                ? r.category.nameFi
                : r.category.nameEn
              : r.ageCategory ?? "";
            return (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-2.5 pl-4 pr-3 text-gray-600">{fmt.format(r.competition.dateStart)}</td>
                <td className="py-2.5 pr-3 font-medium">
                  <Link
                    href={`/${locale}/competitions/${r.competition.slug}`}
                    className="text-primary-light hover:underline"
                  >
                    {r.competition.name}
                  </Link>
                  <span className="ml-2 text-xs text-gray-500">{r.competition.city}</span>
                </td>
                <td className="py-2.5 pr-3 text-gray-600">{categoryDisplay(cat, r.weightClass)}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.placement === 1
                        ? "bg-yellow-100 text-yellow-800"
                        : r.placement === 2
                          ? "bg-gray-200 text-gray-700"
                          : r.placement === 3
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.placement}.
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
