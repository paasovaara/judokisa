"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  key: string;
  label: string;
  icon: string;
  href: string;
}

interface CompetitionSubNavProps {
  locale: string;
  slug: string;
  labels: {
    information: string;
    athletes: string;
    matches: string;
    results: string;
    livestreams: string;
  };
}

const ICONS: Record<string, string> = {
  information: "ℹ️",
  athletes:    "🥋",
  matches:     "⚔️",
  results:     "🏆",
  livestreams: "📺",
};

export default function CompetitionSubNav({ locale, slug, labels }: CompetitionSubNavProps) {
  const pathname = usePathname();
  const base = `/${locale}/competitions/${slug}`;

  const tabs: Tab[] = [
    { key: "information", label: labels.information, icon: ICONS.information, href: base },
    { key: "athletes",    label: labels.athletes,    icon: ICONS.athletes,    href: `${base}/athletes` },
    { key: "matches",     label: labels.matches,     icon: ICONS.matches,     href: `${base}/matches` },
    { key: "results",     label: labels.results,     icon: ICONS.results,     href: `${base}/results` },
    { key: "livestreams", label: labels.livestreams, icon: ICONS.livestreams, href: `${base}/livestreams` },
  ];

  const activeKey =
    pathname === base
      ? "information"
      : tabs.find((t) => t.key !== "information" && pathname.endsWith(`/${t.key}`))?.key ??
        "information";

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-4xl px-4">
        <ul className="flex gap-1 overflow-x-auto scrollbar-none py-2">
          {tabs.map((tab) => {
            const isActive = tab.key === activeKey;
            return (
              <li key={tab.key} className="shrink-0">
                <Link
                  href={tab.href}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
