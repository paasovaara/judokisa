import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function CompetitionMatchesPage({
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
        matches: { orderBy: [{ weightCategory: "asc" }, { round: "asc" }] },
      },
    });
  } catch {
    data = null;
  }

  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });
  const tRounds = await getTranslations({ locale, namespace: "rounds" });

  if (data.matches.length === 0) {
    return <p className="text-sm text-gray-500">{t("no_matches")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2.5 pl-4 pr-3">{locale === "fi" ? "Sarja" : "Category"}</th>
            <th className="py-2.5 pr-3">{locale === "fi" ? "Kierros" : "Round"}</th>
            <th className="py-2.5 pr-3">{locale === "fi" ? "Ottelu" : "Match"}</th>
            <th className="py-2.5 pr-4">{locale === "fi" ? "Tulos" : "Score"}</th>
          </tr>
        </thead>
        <tbody>
          {data.matches.map((m) => (
            <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="py-2.5 pl-4 pr-3 text-xs text-gray-500">{m.weightCategory}</td>
              <td className="py-2.5 pr-3 text-xs text-gray-500">
                {m.round ? tRounds(m.round) : "–"}
              </td>
              <td className="py-2.5 pr-3">
                <span className={m.winnerName === m.athlete1Name ? "font-semibold text-gray-900" : "text-gray-600"}>
                  {m.athlete1Name}
                </span>
                <span className="mx-2 text-gray-400">vs</span>
                <span className={m.winnerName === m.athlete2Name ? "font-semibold text-gray-900" : "text-gray-600"}>
                  {m.athlete2Name}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-gray-600">
                {m.athlete1Score != null && m.athlete2Score != null
                  ? `${m.athlete1Score}–${m.athlete2Score}`
                  : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
