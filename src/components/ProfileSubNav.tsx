"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubNavItem {
  href: string;
  label: string;
  emoji: string;
}

export default function ProfileSubNav({
  locale,
  items,
  forDependent = false,
}: {
  locale: string;
  items: SubNavItem[];
  // When false (default), this is the parent's own subnav; it auto-hides on
  // /profile/dependents/* so a dependent-scoped subnav can take over.
  // When true, the caller is the dependent layout and the subnav always renders.
  forDependent?: boolean;
}) {
  const pathname = usePathname();
  const home = `/${locale}/profile`;

  if (!forDependent && pathname.startsWith(`${home}/dependents/`)) {
    return null;
  }

  // Per-item active state: the home tab matches by equality so it isn't lit
  // by deeper routes; other tabs match by prefix so /history/matches lights
  // up the History tab.
  const findHome = items.find((i) => i.href === home || /\/dependents\/[^/]+$/.test(i.href));
  const homeHref = findHome?.href ?? home;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl overflow-x-auto px-4">
        <ul className="flex gap-1 py-2 whitespace-nowrap">
          {items.map((item) => {
            const isHome = item.href === homeHref;
            const active = isHome
              ? pathname === homeHref
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-primary"
                  }`}
                >
                  <span>{item.emoji}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
