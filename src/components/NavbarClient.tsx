"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/[locale]/login/actions";

type SessionUser = {
  firstName: string;
  lastName: string;
} | null;

export default function NavbarClient({ currentUser }: { currentUser: SessionUser }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const otherLocale = locale === "fi" ? "en" : "fi";
  const switchLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const navLinks: Array<{ href: string; label: string }> = [
    { href: `/${locale}/competitions`, label: t("competitions") },
    { href: `/${locale}/admin`, label: t("admin") },
  ];
  if (currentUser) {
    navLinks.push({ href: `/${locale}/profile`, label: t("profile") });
  }

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-primary/20 bg-primary shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="text-lg font-bold tracking-tight text-white hover:opacity-90"
        >
          🥋 JudoKisa
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-white underline underline-offset-4"
                  : "text-blue-100 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {currentUser ? (
            <form action={logout.bind(null, locale)}>
              <button
                type="submit"
                className="text-sm font-medium text-blue-100 transition-colors hover:text-white"
                title={`${currentUser.firstName} ${currentUser.lastName}`}
              >
                {t("logout")}
              </button>
            </form>
          ) : (
            <Link
              href={`/${locale}/login`}
              className={`text-sm font-medium transition-colors ${
                isActive(`/${locale}/login`)
                  ? "text-white underline underline-offset-4"
                  : "text-blue-100 hover:text-white"
              }`}
            >
              {t("login")}
            </Link>
          )}

          <button
            onClick={() => router.push(switchLocalePath)}
            className="rounded-md border border-blue-300/40 px-3 py-1 text-xs font-medium text-blue-100 transition-colors hover:border-white hover:text-white"
          >
            {otherLocale.toUpperCase()}
          </button>
        </nav>

        {/* Mobile: language + hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={() => router.push(switchLocalePath)}
            className="rounded-md border border-blue-300/40 px-2.5 py-1 text-xs font-medium text-blue-100"
          >
            {otherLocale.toUpperCase()}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded text-white"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-primary-dark bg-primary md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 text-sm font-medium ${
                isActive(link.href) ? "text-white" : "text-blue-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {currentUser ? (
            <form action={logout.bind(null, locale)} className="border-t border-primary-dark">
              <button
                type="submit"
                onClick={() => setMenuOpen(false)}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-blue-100"
              >
                {t("logout")} · {currentUser.firstName}
              </button>
            </form>
          ) : (
            <Link
              href={`/${locale}/login`}
              onClick={() => setMenuOpen(false)}
              className="block border-t border-primary-dark px-4 py-3 text-sm font-medium text-blue-100"
            >
              {t("login")}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
