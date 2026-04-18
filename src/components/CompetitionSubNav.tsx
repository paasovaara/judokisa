"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  key: string;
  label: string;
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

export default function CompetitionSubNav({ locale, slug, labels }: CompetitionSubNavProps) {
  const pathname = usePathname();
  const base = `/${locale}/competitions/${slug}`;

  const tabs: Tab[] = [
    { key: "information", label: labels.information, href: base },
    { key: "athletes",    label: labels.athletes,    href: `${base}/athletes` },
    { key: "matches",     label: labels.matches,     href: `${base}/matches` },
    { key: "results",     label: labels.results,     href: `${base}/results` },
    { key: "livestreams", label: labels.livestreams, href: `${base}/livestreams` },
  ];

  const activeKey =
    pathname === base
      ? "information"
      : tabs.find((t) => t.key !== "information" && pathname.endsWith(`/${t.key}`))?.key ??
        "information";

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-4xl px-4">
        <ul className="flex overflow-x-auto scrollbar-none -mb-px">
          {tabs.map((tab) => {
            const isActive = tab.key === activeKey;
            return (
              <li key={tab.key} className="shrink-0">
                <Link
                  href={tab.href}
                  className={`inline-block whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
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
