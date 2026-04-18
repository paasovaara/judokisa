import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import HistorySearch from "./HistorySearch";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "history" });
  return { title: t("title") };
}

async function getHistory(q: string, q2: string) {
  if (!q.trim()) return { results: [], matches: [] };

  try {
    const nameFilter = (name: string) => ({
      athleteName: { contains: name.trim(), mode: "insensitive" as const },
    });

    if (q2.trim()) {
      // Head-to-head matches
      const matches = await prisma.match.findMany({
        where: {
          OR: [
            {
              AND: [
                { athlete1Name: { contains: q.trim(), mode: "insensitive" } },
                { athlete2Name: { contains: q2.trim(), mode: "insensitive" } },
              ],
            },
            {
              AND: [
                { athlete1Name: { contains: q2.trim(), mode: "insensitive" } },
                { athlete2Name: { contains: q.trim(), mode: "insensitive" } },
              ],
            },
          ],
        },
        include: { competition: { select: { name: true, city: true, dateStart: true, slug: true } } },
        orderBy: { competition: { dateStart: "desc" } },
        take: 100,
      });
      return { results: [], matches };
    }

    // Single athlete results
    const results = await prisma.result.findMany({
      where: nameFilter(q),
      include: { competition: { select: { name: true, city: true, dateStart: true, slug: true } } },
      orderBy: { competition: { dateStart: "desc" } },
      take: 100,
    });

    return { results, matches: [] };
  } catch {
    return { results: [], matches: [] };
  }
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.q ?? "";
  const q2 = sp.q2 ?? "";

  const t = await getTranslations({ locale, namespace: "history" });
  const tRounds = await getTranslations({ locale, namespace: "rounds" });

  const { results, matches } = await getHistory(q, q2);

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const isHeadToHead = q.trim() && q2.trim();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("description")}</p>

      <HistorySearch
        q={q}
        q2={q2}
        labels={{
          athlete1: t("athlete1_placeholder"),
          athlete2: t("athlete2_placeholder"),
          search: t("search"),
        }}
      />

      {/* Results section */}
      {q.trim() && (
        <div className="mt-8">
          {!isHeadToHead && results.length === 0 && (
            <p className="text-sm text-gray-500">
              {t("no_results")} &ldquo;{q}&rdquo;
            </p>
          )}

          {isHeadToHead && matches.length === 0 && (
            <p className="text-sm text-gray-500">
              {t("no_results")} &ldquo;{q}&rdquo; vs &ldquo;{q2}&rdquo;
            </p>
          )}

          {/* Single athlete placements */}
          {!isHeadToHead && results.length > 0 && (
            <div>
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                {t("placements_tab")}: {q}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="sticky left-0 bg-gray-50 py-3 pl-4 pr-3">{t("competition")}</th>
                      <th className="py-3 pr-3">{t("date")}</th>
                      <th className="py-3 pr-3">{t("city")}</th>
                      <th className="py-3 pr-3">{t("category")}</th>
                      <th className="py-3 pr-4">{t("placement")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="sticky left-0 bg-white py-3 pl-4 pr-3 font-medium text-primary-light hover:underline">
                          <a href={`/${locale}/competitions/${r.competition.slug}`}>
                            {r.competition.name}
                          </a>
                        </td>
                        <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">
                          {fmt.format(r.competition.dateStart)}
                        </td>
                        <td className="py-3 pr-3 text-gray-500">{r.competition.city}</td>
                        <td className="py-3 pr-3 text-gray-500">{r.weightCategory}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`font-semibold ${
                              r.placement === 1
                                ? "text-yellow-600"
                                : r.placement === 2
                                  ? "text-gray-400"
                                  : r.placement === 3
                                    ? "text-amber-700"
                                    : "text-gray-700"
                            }`}
                          >
                            {r.placement}.
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Head-to-head matches */}
          {isHeadToHead && matches.length > 0 && (
            <div>
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                {q} {t("vs")} {q2} — {matches.length} {t("matches_tab").toLowerCase()}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="sticky left-0 bg-gray-50 py-3 pl-4 pr-3">{t("competition")}</th>
                      <th className="py-3 pr-3">{t("date")}</th>
                      <th className="py-3 pr-3">{t("round")}</th>
                      <th className="py-3 pr-3">{t("score")}</th>
                      <th className="py-3 pr-4">{t("winner")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m) => (
                      <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="sticky left-0 bg-white py-3 pl-4 pr-3 font-medium text-primary-light hover:underline">
                          <a href={`/${locale}/competitions/${m.competition.slug}`}>
                            {m.competition.name}
                          </a>
                        </td>
                        <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">
                          {fmt.format(m.competition.dateStart)}
                        </td>
                        <td className="py-3 pr-3 text-gray-500">
                          {m.round ? tRounds(m.round) : "–"}
                        </td>
                        <td className="py-3 pr-3 text-gray-500">
                          {m.athlete1Score != null && m.athlete2Score != null
                            ? `${m.athlete1Score}–${m.athlete2Score}`
                            : "–"}
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {m.winnerName ?? "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
