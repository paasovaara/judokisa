import { getTranslations } from "next-intl/server";
import ProfileSubNav from "@/components/ProfileSubNav";
import { requireCurrentUser } from "@/lib/session";

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireCurrentUser(locale);
  const t = await getTranslations({ locale, namespace: "profile" });

  const items = [
    { href: `/${locale}/profile`,         label: t("tab_overview"), emoji: "👤" },
    { href: `/${locale}/profile/edit`,    label: t("tab_edit"),     emoji: "✏️" },
    { href: `/${locale}/profile/history`, label: t("tab_history"),  emoji: "📜" },
  ];

  return (
    <div>
      <ProfileSubNav locale={locale} items={items} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
