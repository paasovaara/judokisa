import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const tSub = await getTranslations({ locale, namespace: "admin.subnav" });

  // Light dashboard counts — fail soft if DB is down.
  let stats = { competitions: 0, competitors: 0, users: 0, clubs: 0 };
  try {
    const [competitions, competitors, users, clubs] = await Promise.all([
      prisma.competition.count(),
      prisma.competitor.count({ where: { removed: false } }),
      prisma.user.count(),
      prisma.club.count(),
    ]);
    stats = { competitions, competitors, users, clubs };
  } catch {
    // ignore
  }

  const cards = [
    { href: `/${locale}/admin/competitions`, label: tSub("competitions"), count: stats.competitions, emoji: "🥋" },
    { href: `/${locale}/admin/referees`,     label: tSub("referees"),     count: stats.users,        emoji: "🧑‍⚖️" },
    { href: `/${locale}/admin/clubs`,        label: tSub("clubs"),        count: stats.clubs,        emoji: "🏛️", placeholder: true },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-8 text-sm text-gray-500">{t("subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
              c.placeholder ? "opacity-60" : ""
            }`}
          >
            <div className="mb-2 text-2xl">{c.emoji}</div>
            <div className="text-3xl font-extrabold text-primary">{c.count}</div>
            <div className="mt-1 text-sm font-medium text-gray-700">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
