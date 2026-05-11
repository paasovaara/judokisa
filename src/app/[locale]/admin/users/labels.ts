import { getTranslations } from "next-intl/server";

export async function buildUserFormLabels(locale: string) {
  const t = await getTranslations({ locale, namespace: "admin.users" });
  return {
    locale,
    sectionIdentity: t("section_identity"),
    sectionRoles: t("section_roles"),
    sectionProfile: t("section_profile"),
    sectionStatus: t("section_status"),
    sectionSuomiSport: t("section_suomisport"),
    firstName: t("form.first_name"),
    lastName: t("form.last_name"),
    email: t("form.email"),
    phone: t("form.phone"),
    dateOfBirth: t("form.date_of_birth"),
    address: t("form.address"),
    club: t("form.club"),
    geographicArea: t("form.geographic_area"),
    judoGrade: t("form.judo_grade"),
    refereeLicense: t("form.referee_license"),
    defaultCategoryCode: t("form.default_category_code"),
    defaultWeightClass: t("form.default_weight_class"),
    suomiSportInternalId: t("form.suomi_sport_internal_id"),
    suomiSportPersonId: t("form.suomi_sport_person_id"),
    inactive: t("form.inactive"),
    blacklisted: t("form.blacklisted"),
    gdprNoSync: t("form.gdpr_no_sync"),
    roles: {
      isAdministrator: t("roles.isAdministrator"),
      isCommission: t("roles.isCommission"),
      isCoordinator: t("roles.isCoordinator"),
      isCompetitionManager: t("roles.isCompetitionManager"),
      isCompetitionAssistant: t("roles.isCompetitionAssistant"),
      isCompetitionResponsible: t("roles.isCompetitionResponsible"),
      isCourseInstructor: t("roles.isCourseInstructor"),
      isReferee: t("roles.isReferee"),
      isJudoShiaiOperator: t("roles.isJudoShiaiOperator"),
      isVideoOperator: t("roles.isVideoOperator"),
    },
    save: t("save"),
    cancel: t("cancel"),
  };
}
