"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubNavItem {
  href: string;
  label: string;
  emoji: string;
  /** When true, render but mark visually as not yet implemented. */
  placeholder?: boolean;
}

interface Props {
  locale: string;
  items: SubNavItem[];
}

export default function AdminSubNav({ locale, items }: Props) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl overflow-x-auto px-4">
        <ul className="flex gap-1 py-2 whitespace-nowrap">
          {items.map((item) => {
            // Active when current pathname starts with the item href.
            // /{locale}/admin must NOT light up for /{locale}/admin/competitions
            const home = `/${locale}/admin`;
            const isHome = item.href === home;
            const active = isHome
              ? pathname === home
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : item.placeholder
                        ? "text-gray-400 hover:bg-gray-100"
                        : "text-gray-700 hover:bg-gray-100 hover:text-primary"
                  }`}
                >
                  <span>{item.emoji}</span>
                  {item.label}
                  {item.placeholder && (
                    <span className="ml-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                      soon
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
