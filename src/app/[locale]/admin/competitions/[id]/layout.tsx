import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";

export default async function AdminCompetitionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  let competition;
  try {
    competition = await prisma.competition.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, status: true, type: true, level: true, city: true },
    });
  } catch {
    competition = null;
  }
  if (!competition) notFound();

  const tTabs = await getTranslations({ locale, namespace: "admin.tabs" });
  const tComp = await getTranslations({ locale, namespace: "admin.competitions" });

  const base = `/${locale}/admin/competitions/${id}`;
  const tabs = [
    { href: base,                     label: tTabs("overview"),    emoji: "ℹ️" },
    { href: `${base}/edit`,           label: tComp("edit"),        emoji: "✎" },
    { href: `${base}/categories`,     label: tTabs("categories"),  emoji: "🏷" },
    { href: `${base}/competitors`,    label: tTabs("competitors"), emoji: "👥" },
    { href: `${base}/results`,        label: tTabs("results"),     emoji: "🏆" },
    { href: `${base}/matches`,        label: tTabs("matches"),     emoji: "⚔️" },
    { href: `${base}/video-feeds`,    label: tTabs("video_feeds"), emoji: "📺" },
    { href: `${base}/referees`,       label: tTabs("referees"),    emoji: "🧑‍⚖️" },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/competitions`}
          className="mb-2 inline-block text-sm text-primary-light hover:underline"
        >
          ← {tComp("title")}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{competition.name}</h1>
        <p className="text-sm text-gray-500">
          {competition.city} · <span className="font-mono text-xs">{competition.slug}</span>
          {competition.level ? ` · ${competition.level}` : ""}
          {` · ${competition.status}`}
        </p>
      </div>

      <div className="mb-6 overflow-x-auto border-b border-gray-200">
        <ul className="flex gap-1 whitespace-nowrap">
          {tabs.map((tab) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-primary"
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {children}
    </div>
  );
}
