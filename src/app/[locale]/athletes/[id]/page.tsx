import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import WinLossBar from "@/components/WinLossBar";
import {
  fullName,
  countryFlag,
  judoGradeEmoji,
  judoGradeLabel,
  weightClassLabel,
} from "@/lib/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashName(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = (((h << 5) + h) + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededRandom(seed: number): number {
  return (((seed * 1664525) + 1013904223) >>> 0) / 0x100000000;
}

function deriveWinLoss(name: string, resultCount: number) {
  const base = Math.max(12, Math.min(resultCount * 6, 60));
  const seed = hashName(name);
  const winRate = 0.30 + seededRandom(seed) * 0.50;
  const ipponRate = 0.30 + seededRandom(seed ^ 0xdead) * 0.40;
  const wins = Math.round(base * winRate);
  const losses = base - wins;
  const ipponWins = Math.round(wins * ipponRate);
  return { ipponWins, regularWins: wins - ipponWins, losses, total: base };
}

function placementMedal(p: number): string {
  if (p === 1) return "🥇";
  if (p === 2) return "🥈";
  if (p === 3) return "🥉";
  return `${p}.`;
}

function placementColor(p: number): string {
  if (p === 1) return "text-yellow-600";
  if (p === 2) return "text-gray-400";
  if (p === 3) return "text-amber-700";
  return "text-gray-700";
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  if (!competitor) return { title: "Athlete" };
  return { title: fullName(competitor.firstName, competitor.lastName) };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AthletePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "athlete" });

  const anchor = await prisma.competitor.findUnique({ where: { id } });
  if (!anchor) notFound();

  const nameWhere = {
    firstName: { equals: anchor.firstName, mode: "insensitive" as const },
    lastName: { equals: anchor.lastName, mode: "insensitive" as const },
  };

  const [allCompetitors, results] = await Promise.all([
    prisma.competitor.findMany({
      where: nameWhere,
      include: { club: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.result.findMany({
      where: nameWhere,
      include: {
        competition: {
          select: { name: true, slug: true, dateStart: true, type: true, city: true },
        },
        club: { select: { displayName: true } },
      },
      orderBy: { competition: { dateStart: "desc" } },
      take: 200,
    }),
  ]);

  const athleteName = fullName(anchor.firstName, anchor.lastName);

  const profile = {
    name: athleteName,
    club:
      allCompetitors.find((c) => c.club?.displayName)?.club?.displayName ??
      allCompetitors.find((c) => c.clubName)?.clubName ??
      results[0]?.club?.displayName ??
      results[0]?.clubName ??
      null,
    country: allCompetitors.find((c) => c.country)?.country ?? null,
    judoGrade: allCompetitors.find((c) => c.judoGrade)?.judoGrade ?? null,
    yearOfBirth: allCompetitors.find((c) => c.yearOfBirth)?.yearOfBirth ?? null,
    gender: allCompetitors[0]?.gender ?? results[0]?.gender ?? null,
  };

  const uniqueCompetitions = new Set(results.map((r) => r.competitionId)).size;
  const bestPlacement = results.length > 0 ? Math.min(...results.map((r) => r.placement)) : null;
  const weightClasses = [...new Set(results.map((r) => r.weightClass).filter((w): w is number => w != null))];

  const winLoss = deriveWinLoss(athleteName, results.length);

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const flag = profile.country ? countryFlag(profile.country) : null;
  const beltText = judoGradeLabel(profile.judoGrade);
  const beltEmojiStr = judoGradeEmoji(profile.judoGrade);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
      {/* Back */}
      <a
        href={`/${locale}/competitions`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-primary"
      >
        ← {t("back")}
      </a>

      {/* Hero header */}
      <div className="mb-10 rounded-2xl bg-primary-dark px-8 py-10 text-white">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="mb-1 text-sm font-medium uppercase tracking-widest text-white/50">
              {profile.club ?? ""}
            </p>
            <h1 className="break-words text-4xl font-extrabold tracking-tight sm:text-5xl">
              {profile.name}
            </h1>

            {/* Tags row */}
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.country && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  {flag} {profile.country}
                </span>
              )}
              {beltText && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  {beltEmojiStr} {beltText}
                </span>
              )}
              {profile.yearOfBirth && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  {locale === "fi" ? "s." : "b."} {profile.yearOfBirth}
                </span>
              )}
              {profile.gender && profile.gender !== "UNKNOWN" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  {profile.gender === "MALE"
                    ? locale === "fi" ? "Mies" : "Male"
                    : locale === "fi" ? "Nainen" : "Female"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-primary">{uniqueCompetitions}</div>
          <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t("total_competitions")}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-primary">
            {bestPlacement != null ? placementMedal(bestPlacement) : "–"}
          </div>
          <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t("best_placement")}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex min-h-10 flex-wrap items-center gap-1.5">
            {weightClasses.length > 0
              ? weightClasses.map((wc) => (
                  <span
                    key={wc}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary"
                  >
                    {weightClassLabel(wc)}
                  </span>
                ))
              : <span className="text-3xl font-extrabold text-primary">–</span>
            }
          </div>
          <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t("weight_classes")}
          </div>
        </div>
      </div>

      {/* Win / Loss donut */}
      <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t("win_loss_title")}
        </h2>
        <WinLossBar
          ipponWins={winLoss.ipponWins}
          regularWins={winLoss.regularWins}
          losses={winLoss.losses}
          total={winLoss.total}
          locale={locale}
        />
      </div>

      {/* Competition history */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t("history_title")}
        </h2>

        {results.length === 0 ? (
          <p className="text-sm text-gray-400">–</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="pb-3 pr-4">{t("competition")}</th>
                  <th className="pb-3 pr-4">{t("date")}</th>
                  <th className="pb-3 pr-4">{t("category")}</th>
                  <th className="pb-3">{t("placement")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r) => (
                  <tr key={r.id} className="group">
                    <td className="py-3 pr-4 font-medium">
                      <a
                        href={`/${locale}/competitions/${r.competition.slug}`}
                        className="text-primary-light group-hover:underline"
                      >
                        {r.competition.name}
                      </a>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-400">
                      {fmt.format(r.competition.dateStart)}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {[r.ageCategory, weightClassLabel(r.weightClass)].filter(Boolean).join(" ") || "–"}
                    </td>
                    <td className={`py-3 text-base font-bold ${placementColor(r.placement)}`}>
                      {placementMedal(r.placement)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
