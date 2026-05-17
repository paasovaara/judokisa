import { getTranslations } from "next-intl/server";
import AdminSubNav from "@/components/AdminSubNav";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Gate the whole admin subtree on at least one admin-relevant role flag.
  // Server actions individually re-check (defence in depth) — see each
  // admin/*/actions.ts file.
  await requireAdmin(locale);
  const t = await getTranslations({ locale, namespace: "admin.subnav" });

  const items = [
    { href: `/${locale}/admin/competitions`, label: t("competitions"), emoji: "🥋" },
    { href: `/${locale}/admin/users`,        label: t("users"),        emoji: "👤" },
    { href: `/${locale}/admin/referees`,     label: t("referees"),     emoji: "🧑‍⚖️" },
    { href: `/${locale}/admin/courses`,      label: t("courses"),      emoji: "📚", placeholder: true },
    { href: `/${locale}/admin/clubs`,        label: t("clubs"),        emoji: "🏛️" },
    { href: `/${locale}/admin/suomisport`,   label: t("suomisport"),   emoji: "🔄", placeholder: true },
  ];

  return (
    <div>
      <AdminSubNav locale={locale} items={items} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
