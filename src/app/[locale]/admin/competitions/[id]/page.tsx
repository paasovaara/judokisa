import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { deleteCompetition } from "../actions";

export default async function AdminCompetitionOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          categories: true,
          competitors: true,
          results: true,
          matches: true,
          videoFeeds: true,
          refereeInvitations: true,
        },
      },
    },
  });
  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "admin.competitions" });
  const tForm = await getTranslations({ locale, namespace: "admin.competitions.form" });
  const tTabs = await getTranslations({ locale, namespace: "admin.tabs" });

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  async function deleteAction() {
    "use server";
    await deleteCompetition(locale, id);
  }

  const fields: Array<[string, React.ReactNode]> = [
    [tForm("name"), competition.name],
    [tForm("slug"), <span key="s" className="font-mono text-xs">{competition.slug}</span>],
    [tForm("type"), competition.type],
    [tForm("level"), competition.level ?? "—"],
    [tForm("status"), competition.status],
    [tForm("registration_open"), competition.registrationOpen ? "✓" : "—"],
    [tForm("date_start"), fmt.format(competition.dateStart)],
    [tForm("date_end"), fmt.format(competition.dateEnd)],
    [tForm("registration_deadline"), competition.registrationDeadline ? fmt.format(competition.registrationDeadline) : "—"],
    [tForm("city"), competition.city],
    [tForm("venue"), competition.venue ?? "—"],
    [tForm("address"), competition.address ?? "—"],
    [tForm("country"), competition.country],
    [tForm("geographic_area"), competition.geographicArea ?? "—"],
    [tForm("capacity"), `${competition.registeredCount}${competition.capacity != null ? ` / ${competition.capacity}` : ""}`],
    [tForm("tatami_count"), competition.numberOfTatamiMats],
    [tForm("target_referee_count"), competition.targetRefereeCount],
    [tForm("match_duration"), competition.matchDurationMinutes],
    [tForm("registration_url"), competition.registrationUrl ?? "—"],
    [tForm("info_url"), competition.infoUrl ?? "—"],
    [tForm("results_url"), competition.resultsUrl ?? "—"],
  ];

  const counts = [
    { href: `categories`,    label: tTabs("categories"),  count: competition._count.categories },
    { href: `competitors`,   label: tTabs("competitors"), count: competition._count.competitors },
    { href: `results`,       label: tTabs("results"),     count: competition._count.results },
    { href: `matches`,       label: tTabs("matches"),     count: competition._count.matches },
    { href: `video-feeds`,   label: tTabs("video_feeds"), count: competition._count.videoFeeds },
    { href: `referees`,      label: tTabs("referees"),    count: competition._count.refereeInvitations },
  ];

  return (
    <div className="space-y-8">
      {/* Counts */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map((c) => (
          <Link
            key={c.href}
            href={`/${locale}/admin/competitions/${id}/${c.href}`}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md"
          >
            <div className="text-2xl font-extrabold text-primary">{c.count}</div>
            <div className="mt-1 text-xs font-medium text-gray-500">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* Field detail */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
              <dd className="text-sm text-gray-800">{value as React.ReactNode}</dd>
            </div>
          ))}
        </dl>
        {competition.description && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{tForm("description")}</dt>
            <dd className="whitespace-pre-line text-sm text-gray-700">{competition.description}</dd>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <form action={deleteAction} className="rounded-xl border border-danger/30 bg-red-50/50 p-6">
        <h2 className="mb-2 text-sm font-semibold text-danger">{t("delete")}</h2>
        <p className="mb-4 text-sm text-gray-600">{t("delete_confirm")}</p>
        <button
          type="submit"
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("delete")}
        </button>
      </form>
    </div>
  );
}
