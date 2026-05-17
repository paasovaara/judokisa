import { getTranslations } from "next-intl/server";
import ProfileHistoryTabs from "@/components/ProfileHistoryTabs";

export default async function DependentHistoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "profile.history" });

  const base = `/${locale}/profile/dependents/${id}/history`;
  const tabs = [
    { href: base,                    label: t("tab_results") },
    { href: `${base}/matches`,       label: t("tab_matches") },
    { href: `${base}/referee`,       label: t("tab_referee") },
    { href: `${base}/registrations`, label: t("tab_registrations") },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <ProfileHistoryTabs tabs={tabs} />
      {children}
    </div>
  );
}
