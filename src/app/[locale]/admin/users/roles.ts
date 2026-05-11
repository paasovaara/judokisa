export const ROLE_KEYS = [
  "isAdministrator",
  "isCommission",
  "isCoordinator",
  "isCompetitionManager",
  "isCompetitionAssistant",
  "isCompetitionResponsible",
  "isCourseInstructor",
  "isReferee",
  "isJudoShiaiOperator",
  "isVideoOperator",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];
