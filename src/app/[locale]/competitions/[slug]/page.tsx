import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { weightClassLabel } from "@/lib/format";

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
        description: true,
        type: true,
        country: true,
        categories: {
          orderBy: { code: "asc" },
          select: { id: true, code: true, nameEn: true, nameFi: true, weightClasses: true },
        },
      },
    });
  } catch {
    competition = null;
  }

  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });
  const isFi = locale === "fi";

  // Distinct weight classes across all categories — useful as a flat overview
  const allWeights = [
    ...new Set(competition.categories.flatMap((c) => c.weightClasses)),
  ].sort((a, b) => a - b);

  const hasContent =
    competition.description ||
    competition.categories.length > 0 ||
    allWeights.length > 0;

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
            {competition.categories.map((cat) => (
              <span
                key={cat.id}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-primary"
                title={cat.code}
              >
                {isFi ? cat.nameFi : cat.nameEn}
              </span>
            ))}
          </div>
        </div>
      )}

      {allWeights.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {isFi ? "Painoluokat" : "Weight categories"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {allWeights.map((wc) => (
              <span
                key={wc}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
              >
                {weightClassLabel(wc)}
              </span>
            ))}
          </div>
        </div>
      )}

      {competition.description && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {isFi ? "Lisätiedot" : "Additional information"}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
            {competition.description}
          </p>
        </div>
      )}
    </div>
  );
}
