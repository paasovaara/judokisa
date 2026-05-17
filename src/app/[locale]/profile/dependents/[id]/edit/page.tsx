import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { requireTargetUser } from "@/lib/session";
import { fullName } from "@/lib/format";
import DependentForm from "../../DependentForm";
import { updateDependent } from "../../actions";

export default async function DependentEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const target = await requireTargetUser(id, locale);
  const t = await getTranslations({ locale, namespace: "profile.dependents.edit" });
  const tForm = await getTranslations({ locale, namespace: "profile.dependents.form" });

  const clubs = await prisma.club.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  const p = target.profile;
  const defaults = {
    firstName: target.firstName,
    lastName: target.lastName,
    phone: p?.phone ?? null,
    dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
    address: p?.address ?? null,
    clubId: p?.clubId ?? null,
    geographicArea: p?.geographicArea ?? null,
    judoGrade: p?.judoGrade ?? null,
    profilePhoto: p?.profilePhoto ?? null,
    defaultCategoryCode: p?.defaultCategoryCode ?? null,
    defaultWeightClass: p?.defaultWeightClass ?? null,
    gdprNoSync: p?.gdprNoSync ?? false,
  };

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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-600">
        {t("intro", { name: fullName(target.firstName, target.lastName) })}
      </p>

      <DependentForm
        mode="edit"
        defaults={defaults}
        clubs={clubs}
        action={updateDependent.bind(null, locale, target.id)}
        cancelHref={`/${locale}/profile/dependents/${target.id}`}
        labels={labels}
      />
    </div>
  );
}
