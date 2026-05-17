import { getTranslations } from "next-intl/server";
import ProfileSubNav from "@/components/ProfileSubNav";
import ActingAsBanner from "@/components/ActingAsBanner";
import { fullName } from "@/lib/format";
import { requireTargetUser } from "@/lib/session";

export default async function DependentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const target = await requireTargetUser(id, locale);
  const t = await getTranslations({ locale, namespace: "profile" });
  const tFamily = await getTranslations({ locale, namespace: "profile.family" });

  const items = [
    { href: `/${locale}/profile/dependents/${id}`,         label: t("tab_overview"), emoji: "👤" },
    { href: `/${locale}/profile/dependents/${id}/edit`,    label: t("tab_edit"),     emoji: "✏️" },
    { href: `/${locale}/profile/dependents/${id}/history`, label: t("tab_history"),  emoji: "📜" },
  ];

  const name = fullName(target.firstName, target.lastName);

  return (
    <div>
      <ProfileSubNav locale={locale} items={items} forDependent />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ActingAsBanner
          name={name}
          backHref={`/${locale}/profile`}
          bannerLabel={tFamily("viewing_as_banner", { name })}
          backLabel={tFamily("back_to_my_profile")}
        />
        {children}
      </div>
    </div>
  );
}
