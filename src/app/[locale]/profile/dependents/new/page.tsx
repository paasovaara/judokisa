import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/session";
import DependentForm from "../DependentForm";
import { createDependent } from "../actions";

export default async function NewDependentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await requireCurrentUser(locale);
  const t = await getTranslations({ locale, namespace: "profile.dependents.create" });
  const tForm = await getTranslations({ locale, namespace: "profile.dependents.form" });

  const clubs = await prisma.club.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  const labels = {
    locale,
    sectionIdentity: tForm("section_identity"),
    sectionContact: tForm("section_contact"),
    sectionJudo: tForm("section_judo"),
    sectionDefaults: tForm("section_defaults"),
    sectionPrivacy: tForm("section_privacy"),
    firstName: tForm("first_name"),
    lastName: tForm("last_name"),
    relation: tForm("relation"),
    relationParent: tForm("relation_parent"),
    relationLegalGuardian: tForm("relation_legal_guardian"),
    relationOther: tForm("relation_other"),
    phone: tForm("phone"),
    dateOfBirth: tForm("date_of_birth"),
    address: tForm("address"),
    club: tForm("club"),
    geographicArea: tForm("geographic_area"),
    judoGrade: tForm("judo_grade"),
    profilePhoto: tForm("profile_photo"),
    profilePhotoHint: tForm("profile_photo_hint"),
    defaultCategoryCode: tForm("default_category_code"),
    defaultWeightClass: tForm("default_weight_class"),
    gdprNoSync: tForm("gdpr_no_sync"),
    gdprNoSyncHint: tForm("gdpr_no_sync_hint"),
    save: t("submit"),
    cancel: t("cancel"),
  };

  // Pre-fill club from the parent's club so siblings tend to inherit it.
  const defaults = {
    clubId: me.profile?.clubId ?? null,
    geographicArea: me.profile?.geographicArea ?? null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-600">{t("intro")}</p>

      <DependentForm
        mode="create"
        defaults={defaults}
        clubs={clubs}
        action={createDependent.bind(null, locale)}
        cancelHref={`/${locale}/profile`}
        labels={labels}
      />
    </div>
  );
}
