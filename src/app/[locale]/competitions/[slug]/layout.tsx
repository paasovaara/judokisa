import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import Badge from "@/components/Badge";
import CapacityBar from "@/components/CapacityBar";
import CompetitionSubNav from "@/components/CompetitionSubNav";
import { CompetitionTabsProvider } from "@/components/CompetitionTabsProvider";

export async function generateStaticParams() {
  try {
    const competitions = await prisma.competition.findMany({ select: { slug: true } });
    return competitions.map((c: { slug: string }) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const c = await prisma.competition.findUnique({
      where: { slug },
      select: { name: true },
    });
    if (!c) return {};
    return { title: c.name };
  } catch {
    return {};
  }
}

export default async function CompetitionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  let competition;
  try {
    competition = await prisma.competition.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        type: true,
        status: true,
        dateStart: true,
        dateEnd: true,
        city: true,
        venue: true,
        categories: true,
        capacity: true,
        registeredCount: true,
        registrationDeadline: true,
        registrationUrl: true,
        description: true,
      },
    });
  } catch {
    competition = null;
  }

  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });
  const tComp = await getTranslations({ locale, namespace: "competitions" });
  const tTypes = await getTranslations({ locale, namespace: "types" });
  const tStatus = await getTranslations({ locale, namespace: "status" });

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dateRange =
    competition.dateStart.toDateString() === competition.dateEnd.toDateString()
      ? fmt.format(competition.dateStart)
      : `${fmt.format(competition.dateStart)} – ${fmt.format(competition.dateEnd)}`;

  const isFull =
    competition.capacity != null && competition.registeredCount >= competition.capacity;

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 pt-6 pb-4">
          {/* Back link */}
          <Link
            href={`/${locale}/competitions`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-primary-light hover:underline"
          >
            ← {tComp("title")}
          </Link>

          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge label={tTypes(competition.type)} value={competition.type} variant="type" />
                <Badge label={tStatus(competition.status)} value={competition.status} variant="status" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{competition.name}</h1>
              <p className="mt-1 text-gray-500">
                {dateRange} &middot; {competition.city}
                {competition.venue ? `, ${competition.venue}` : ""}
              </p>
            </div>

            {competition.registrationUrl && competition.status === "UPCOMING" && !isFull && (
              <a
                href={competition.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {tComp("register")} →
              </a>
            )}
            {isFull && (
              <span className="shrink-0 rounded-lg bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger">
                {tComp("full")}
              </span>
            )}
          </div>

          {/* Details strip */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("date")}</p>
              <p className="mt-0.5 text-sm text-gray-700">{dateRange}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("location")}</p>
              <p className="mt-0.5 text-sm text-gray-700">
                {competition.city}{competition.venue ? ` — ${competition.venue}` : ""}
              </p>
            </div>
            {competition.registrationDeadline && competition.status === "UPCOMING" && !isFull && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{tComp("registration_deadline")}</p>
                <p className="mt-0.5 text-sm text-gray-700">{fmt.format(competition.registrationDeadline)}</p>
              </div>
            )}
            {competition.capacity != null && (
              <div className="min-w-36">
                <CapacityBar
                  registered={competition.registeredCount}
                  capacity={competition.capacity}
                  label={tComp("capacity")}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <CompetitionSubNav
        locale={locale}
        slug={slug}
        labels={{
          information: t("tab_information"),
          athletes: t("tab_athletes"),
          matches: t("tab_matches"),
          results: t("tab_results"),
          livestreams: t("tab_livestreams"),
        }}
      />

      {/* Tab content */}
      <CompetitionTabsProvider slug={slug}>
        <div className="mx-auto max-w-4xl px-4 py-8">
          {children}
        </div>
      </CompetitionTabsProvider>
    </div>
  );
}
