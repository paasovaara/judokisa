import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/db";
import CompetitionCard from "@/components/CompetitionCard";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("hero_title") };
}

async function getHomeData() {
  try {
    const [upcoming, recent] = await Promise.all([
      prisma.competition.findMany({
        where: { status: "UPCOMING" },
        orderBy: { dateStart: "asc" },
        take: 5,
      }),
      prisma.competition.findMany({
        where: { status: "COMPLETED" },
        orderBy: { dateStart: "desc" },
        take: 5,
        include: {
          results: {
            where: { placement: { lte: 3 } },
            orderBy: [{ weightCategory: "asc" }, { placement: "asc" }],
            take: 30,
          },
        },
      }),
    ]);
    return { upcoming, recent };
  } catch {
    return { upcoming: [], recent: [] };
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const tComp = await getTranslations({ locale, namespace: "competition" });
  const { upcoming, recent } = await getHomeData();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary-dark px-4 py-16 text-center text-white md:py-28">
        {/* Background image */}
        <img
          src="/hero.avif"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-dark/60 via-primary-dark/40 to-primary-dark/80" />

        {/* Content */}
        <div className="relative z-10">
          <h1 className="mb-3 text-4xl font-bold tracking-tight drop-shadow md:text-5xl">
            {t("hero_title")}
          </h1>
          <p className="mb-8 text-lg text-blue-100 drop-shadow md:text-xl">{t("hero_subtitle")}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/${locale}/competitions`}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow transition-opacity hover:opacity-90"
            >
              {t("upcoming_title")} →
            </Link>
            <Link
              href={`/${locale}/history`}
              className="rounded-lg border border-blue-300/50 px-6 py-3 text-sm font-semibold text-blue-100 transition-colors hover:border-white hover:text-white"
            >
              {t("search_placeholder")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-12">
        {/* Upcoming competitions */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t("upcoming_title")}</h2>
            <Link
              href={`/${locale}/competitions?tab=upcoming`}
              className="text-sm font-medium text-primary-light hover:underline"
            >
              {t("view_all")} →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">–</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((c) => (
                <CompetitionCard
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  type={c.type}
                  status={c.status}
                  dateStart={c.dateStart}
                  dateEnd={c.dateEnd}
                  city={c.city}
                  registrationDeadline={c.registrationDeadline}
                  registeredCount={c.registeredCount}
                  capacity={c.capacity}
                  registrationUrl={c.registrationUrl}
                />
              ))}
            </div>
          )}
        </section>

        {/* Latest results */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t("results_title")}</h2>
            <Link
              href={`/${locale}/competitions?tab=past`}
              className="text-sm font-medium text-primary-light hover:underline"
            >
              {t("view_all")} →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">–</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((c) => (
                <Link
                  key={c.id}
                  href={`/${locale}/competitions/${c.slug}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="mb-1 font-semibold text-gray-900 line-clamp-1">{c.name}</h3>
                  <p className="mb-3 text-sm text-gray-500">
                    {new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(c.dateStart)}{" "}
                    &middot; {c.city}
                  </p>
                  {c.results.length > 0 ? (
                    <ul className="space-y-1">
                      {c.results.slice(0, 3).map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <span className="w-5 text-center font-bold text-gray-400">
                            {r.placement}.
                          </span>
                          <span className="text-gray-700">{r.athleteName}</span>
                          <span className="text-xs text-gray-400">{r.weightCategory}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">{tComp("no_results")}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
