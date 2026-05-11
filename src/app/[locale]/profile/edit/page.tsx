import { getTranslations } from "next-intl/server";
import { requireCurrentUser } from "@/lib/session";
import { fullName } from "@/lib/format";
import ProfileForm from "./ProfileForm";
import { updateOwnProfile } from "./actions";

export default async function ProfileEditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  const t = await getTranslations({ locale, namespace: "profile.edit" });
  const tCommon = await getTranslations({ locale, namespace: "profile" });

  const p = user.profile;
  const defaults = {
    phone: p?.phone ?? null,
    dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
    address: p?.address ?? null,
    club: p?.club ?? null,
    geographicArea: p?.geographicArea ?? null,
    judoGrade: p?.judoGrade ?? null,
    profilePhoto: p?.profilePhoto ?? null,
    defaultCategoryCode: p?.defaultCategoryCode ?? null,
    defaultWeightClass: p?.defaultWeightClass ?? null,
    gdprNoSync: p?.gdprNoSync ?? false,
  };

  const labels = {
    locale,
    sectionContact: t("section_contact"),
    sectionJudo: t("section_judo"),
    sectionDefaults: t("section_defaults"),
    sectionPrivacy: t("section_privacy"),
    phone: t("phone"),
    dateOfBirth: t("date_of_birth"),
    address: t("address"),
    club: t("club"),
    geographicArea: t("geographic_area"),
    judoGrade: t("judo_grade"),
    profilePhoto: t("profile_photo"),
    profilePhotoHint: t("profile_photo_hint"),
    defaultCategoryCode: t("default_category_code"),
    defaultWeightClass: t("default_weight_class"),
    gdprNoSync: t("gdpr_no_sync"),
    gdprNoSyncHint: t("gdpr_no_sync_hint"),
    save: t("save"),
    cancel: t("cancel"),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{tCommon("tab_edit")}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {t("intro", { name: fullName(user.firstName, user.lastName) })}
      </p>

      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-semibold text-gray-700">{t("readonly_section")}</p>
        <dl className="mt-2 grid gap-1 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">{t("readonly_email")}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">{t("readonly_name")}</dt>
            <dd>{fullName(user.firstName, user.lastName)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-gray-400">{t("readonly_hint")}</p>
      </div>

      <ProfileForm
        defaults={defaults}
        action={updateOwnProfile.bind(null, locale)}
        cancelHref={`/${locale}/profile`}
        labels={labels}
      />
    </div>
  );
}
