import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import Badge from "@/components/Badge";
import ResultsTable from "@/components/ResultsTable";
import CapacityBar from "@/components/CapacityBar";
import type { Metadata } from "next";

export async function generateStaticParams() {
  try {
    const competitions = await prisma.competition.findMany({
      select: { slug: true },
    });
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
    const competition = await prisma.competition.findUnique({
      where: { slug },
      select: { name: true, city: true, dateStart: true },
    });
    if (!competition) return {};
    return { title: competition.name };
  } catch {
    return {};
  }
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  let competition;
  try {
    competition = await prisma.competition.findUnique({
      where: { slug },
      include: {
        results: { orderBy: [{ weightCategory: "asc" }, { placement: "asc" }] },
        matches: { orderBy: { round: "asc" } },
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
  const tRounds = await getTranslations({ locale, namespace: "rounds" });

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dateRange =
    competition.dateStart.toDateString() === competition.dateEnd.toDateString()
      ? fmt.format(competition.dateStart)
      : `${fmt.format(competition.dateStart)} – ${fmt.format(competition.dateEnd)}`;

  // Group results by weight category
  type ResultRow = (typeof competition.results)[number];
  const resultsByCategory = competition.results.reduce(
    (acc: Record<string, ResultRow[]>, r: ResultRow) => {
      const key = `${r.ageCategory ?? ""} ${r.weightCategory}`.trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {},
  );

  const isFull =
    competition.capacity != null &&
    competition.registeredCount >= competition.capacity;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`/${locale}/competitions`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-primary-light hover:underline"
      >
        ← {tComp("title")}
      </Link>

      {/* Info pane */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
        {/* Title row */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge label={tTypes(competition.type)} value={competition.type} variant="type" />
              <Badge label={tStatus(competition.status)} value={competition.status} variant="status" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{competition.name}</h1>
          </div>

          {/* Registration CTA */}
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

        {/* Details grid */}
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("date")}</p>
            <p className="mt-1 text-sm text-gray-700">{dateRange}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("location")}</p>
            <p className="mt-1 text-sm text-gray-700">
              {competition.city}{competition.venue ? ` — ${competition.venue}` : ""}
            </p>
          </div>
          {competition.categories.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{t("categories")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {competition.categories.map((cat: string) => (
                  <span key={cat} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-primary">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
          {competition.registrationDeadline && competition.status === "UPCOMING" && !isFull && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{tComp("registration_deadline")}</p>
              <p className="mt-1 text-sm text-gray-700">{fmt.format(competition.registrationDeadline)}</p>
            </div>
          )}
          {competition.capacity != null && (
            <div className="sm:col-span-2 md:col-span-1">
              <CapacityBar
                registered={competition.registeredCount}
                capacity={competition.capacity}
                label={tComp("capacity")}
              />
            </div>
          )}
        </div>

        {competition.description && (
          <p className="mt-4 border-t border-gray-200 pt-4 text-sm text-gray-600">{competition.description}</p>
        )}
      </div>

      {/* Video */}
      {competition.videoUrl && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">{t("video")}</h2>
          {competition.videoUrl.includes("youtube.com") || competition.videoUrl.includes("youtu.be") ? (
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe
                src={competition.videoUrl
                  .replace("watch?v=", "embed/")
                  .replace("youtu.be/", "www.youtube.com/embed/")}
                className="h-full w-full"
                allowFullScreen
                title={competition.name}
              />
            </div>
          ) : (
            <a
              href={competition.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              ▶ {t("watch_stream")}
            </a>
          )}
        </section>
      )}

      {/* Results */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{t("results")}</h2>
        {competition.status !== "COMPLETED" || competition.results.length === 0 ? (
          <p className="text-sm text-gray-500">{t("no_results")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(resultsByCategory) as [string, ResultRow[]][]).map(([category, results]) => (
              <div key={category} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-primary">{category}</h3>
                <ResultsTable results={results} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Matches */}
      {competition.matches.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {locale === "fi" ? "Ottelut" : "Matches"}
          </h2>
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
                {competition.matches.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 pl-4 pr-3 text-xs text-gray-500">{m.weightCategory}</td>
                    <td className="py-2.5 pr-3 text-xs text-gray-500">{m.round ? tRounds(m.round) : "–"}</td>
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
        </section>
      )}
    </div>
  );
}
