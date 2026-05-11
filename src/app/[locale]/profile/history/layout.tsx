import { getTranslations } from "next-intl/server";
import ProfileHistoryTabs from "@/components/ProfileHistoryTabs";

export default async function ProfileHistoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile.history" });

  const tabs = [
    { href: `/${locale}/profile/history`,               label: t("tab_results") },
    { href: `/${locale}/profile/history/matches`,       label: t("tab_matches") },
    { href: `/${locale}/profile/history/referee`,       label: t("tab_referee") },
    { href: `/${locale}/profile/history/registrations`, label: t("tab_registrations") },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <ProfileHistoryTabs tabs={tabs} />
      {children}
    </div>
  );
}
