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

export const ROLE_BADGE_LABEL: Record<RoleKey, string> = {
  isAdministrator: "Admin",
  isCommission: "Commission",
  isCoordinator: "Coordinator",
  isCompetitionManager: "Manager",
  isCompetitionAssistant: "Assistant",
  isCompetitionResponsible: "Responsible",
  isCourseInstructor: "Instructor",
  isReferee: "Referee",
  isJudoShiaiOperator: "JudoShiai",
  isVideoOperator: "Video",
};
