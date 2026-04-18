import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import CompetitionCard from "@/components/CompetitionCard";
import CompetitionFilters from "./CompetitionFilters";
import type { Metadata } from "next";
import type { CompetitionType } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "competitions" });
  return { title: t("title") };
}

const PAGE_SIZE = 20;

async function getCompetitions({
  tab,
  q,
  type,
  page,
}: {
  tab: string;
  q: string;
  type: string;
  page: number;
}) {
  const isPast = tab === "past";

  try {
    const where = {
      status: isPast
        ? ("COMPLETED" as const)
        : { in: ["UPCOMING", "ONGOING"] as ("UPCOMING" | "ONGOING")[] },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { city: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(type ? { type: type as CompetitionType } : {}),
    };

    const [competitions, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        orderBy: { dateStart: isPast ? "desc" : "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.competition.count({ where }),
    ]);

    return { competitions, total };
  } catch {
    return { competitions: [], total: 0 };
  }
}

export default async function CompetitionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const q = sp.q ?? "";
  const type = sp.type ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));

  const t = await getTranslations({ locale, namespace: "competitions" });
  const tTypes = await getTranslations({ locale, namespace: "types" });

  const { competitions, total } = await getCompetitions({ tab, q, type, page });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const typeOptions = [
    "TOURNAMENT",
    "CHAMPIONSHIP",
    "KATA",
    "CAMP",
    "OPEN",
    "INTERNATIONAL",
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("title")}</h1>

      <CompetitionFilters
        tab={tab}
        q={q}
        type={type}
        typeOptions={typeOptions.map((v) => ({ value: v, label: tTypes(v) }))}
        labels={{
          upcoming: t("upcoming"),
          past: t("past"),
          searchPlaceholder: t("search_placeholder"),
          filterType: t("filter_type"),
          allTypes: t("all_types"),
        }}
      />

      {competitions.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-500">{t("no_results")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((c) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?tab=${tab}&q=${q}&type=${type}&page=${p}`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-primary text-white"
                  : "border border-gray-200 text-gray-700 hover:border-primary-light hover:text-primary-light"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
