import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function CompetitionInformationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  let competition;
  try {
    competition = await prisma.competition.findUnique({
      where: { slug },
      select: {
        categories: true,
        weightCategories: true,
        description: true,
        type: true,
        country: true,
      },
    });
  } catch {
    competition = null;
  }

  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });

  const hasContent =
    competition.description ||
    competition.categories.length > 0 ||
    competition.weightCategories.length > 0;

  return (
    <div className="space-y-6">
      {!hasContent && (
        <p className="text-sm text-gray-500">{t("no_results")}</p>
      )}

      {competition.categories.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {t("categories")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {competition.categories.map((cat: string) => (
              <span
                key={cat}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-primary"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {competition.weightCategories.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {locale === "fi" ? "Painoluokat" : "Weight categories"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {competition.weightCategories.map((wc: string) => (
              <span
                key={wc}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
              >
                {wc}
              </span>
            ))}
          </div>
        </div>
      )}

      {competition.description && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {locale === "fi" ? "Lisätiedot" : "Additional information"}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
            {competition.description}
          </p>
        </div>
      )}
    </div>
  );
}
