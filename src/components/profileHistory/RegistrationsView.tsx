import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fullName, categoryDisplay } from "@/lib/format";
import { getUserRegistrations } from "@/lib/profileHistory";

export default async function RegistrationsView({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "profile.history" });
  const entries = await getUserRegistrations(userId);
  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">{t("empty_registrations")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2.5 pl-4 pr-3">{t("col_date")}</th>
            <th className="py-2.5 pr-3">{t("col_competition")}</th>
            <th className="py-2.5 pr-3">{t("col_competitor")}</th>
            <th className="py-2.5 pr-3">{t("col_category")}</th>
            <th className="py-2.5 pr-4">{t("col_club")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((c) => {
            const cat = c.category
              ? locale === "fi"
                ? c.category.nameFi
                : c.category.nameEn
              : "";
            return (
              <tr
                key={c.id}
                className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                  c.removed ? "opacity-60" : ""
                }`}
              >
                <td className="py-2.5 pl-4 pr-3 text-gray-600">{fmt.format(c.competition.dateStart)}</td>
                <td className="py-2.5 pr-3 font-medium">
                  <Link
                    href={`/${locale}/competitions/${c.competition.slug}`}
                    className="text-primary-light hover:underline"
                  >
                    {c.competition.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 text-gray-900">{fullName(c.firstName, c.lastName)}</td>
                <td className="py-2.5 pr-3 text-gray-600">{categoryDisplay(cat, c.weightClass)}</td>
                <td className="py-2.5 pr-4 text-gray-600">{c.clubName ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
