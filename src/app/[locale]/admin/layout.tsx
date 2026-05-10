import { getTranslations } from "next-intl/server";
import AdminSubNav from "@/components/AdminSubNav";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.subnav" });

  // No role enforcement in this implementation wave (auth out of scope).
  // All subnav items are always visible. Items marked `placeholder` are
  // not yet implemented and link to /admin (the landing page).
  const items = [
    { href: `/${locale}/admin/competitions`, label: t("competitions"), emoji: "🥋" },
    { href: `/${locale}/admin/referees`,     label: t("referees"),     emoji: "🧑‍⚖️" },
    { href: `/${locale}/admin/courses`,      label: t("courses"),      emoji: "📚", placeholder: true },
    { href: `/${locale}/admin/users`,        label: t("users"),        emoji: "👤", placeholder: true },
    { href: `/${locale}/admin/clubs`,        label: t("clubs"),        emoji: "🏛️", placeholder: true },
    { href: `/${locale}/admin/suomisport`,   label: t("suomisport"),   emoji: "🔄", placeholder: true },
  ];

  return (
    <div>
      <AdminSubNav locale={locale} items={items} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
