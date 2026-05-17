import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fullName, categoryDisplay } from "@/lib/format";
import { getUserMatches } from "@/lib/profileHistory";

export default async function MatchesView({
  userId,
  locale,
}: {
  userId: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "profile.history" });
  const matches = await getUserMatches(userId);
  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  if (matches.length === 0) {
    return <p className="text-sm text-gray-500">{t("empty_matches")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2.5 pl-4 pr-3">{t("col_date")}</th>
            <th className="py-2.5 pr-3">{t("col_competition")}</th>
            <th className="py-2.5 pr-3">{t("col_category")}</th>
            <th className="py-2.5 pr-3">{t("col_opponent")}</th>
            <th className="py-2.5 pr-4">{t("col_result")}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const userIsSide1 = m.athlete1Id === userId;
            const opponent = userIsSide1
              ? fullName(m.athlete2First, m.athlete2Last)
              : fullName(m.athlete1First, m.athlete1Last);
            const opponentClub = userIsSide1 ? m.athlete2Club : m.athlete1Club;
            const userScore = userIsSide1 ? m.athlete1Score : m.athlete2Score;
            const oppScore = userIsSide1 ? m.athlete2Score : m.athlete1Score;
            const userSide = userIsSide1 ? 1 : 2;
            const won = m.winnerSide != null && m.winnerSide === userSide;
            const lost = m.winnerSide != null && m.winnerSide !== userSide;
            const cat = m.category
              ? locale === "fi"
                ? m.category.nameFi
                : m.category.nameEn
              : "";
            return (
              <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-2.5 pl-4 pr-3 text-gray-600">{fmt.format(m.competition.dateStart)}</td>
                <td className="py-2.5 pr-3 font-medium">
                  <Link
                    href={`/${locale}/competitions/${m.competition.slug}`}
                    className="text-primary-light hover:underline"
                  >
                    {m.competition.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 text-gray-600">{categoryDisplay(cat, m.weightClass)}</td>
                <td className="py-2.5 pr-3">
                  <span className="font-medium text-gray-900">{opponent}</span>
                  {opponentClub && (
                    <span className="ml-1 text-xs text-gray-500">· {opponentClub}</span>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      won
                        ? "bg-green-100 text-success"
                        : lost
                          ? "bg-red-100 text-danger"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {won ? t("won") : lost ? t("lost") : "—"}
                    {userScore != null && oppScore != null && (
                      <span className="ml-1 text-gray-500">
                        {userScore}-{oppScore}
                      </span>
                    )}
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
