import type { JudoGrade, Gender } from "@prisma/client";

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** Press-output style: "Last First" — used when output requires that ordering. */
export function lastFirst(firstName: string, lastName: string): string {
  return `${lastName} ${firstName}`.trim();
}

const GRADE_LABEL: Record<JudoGrade, string> = {
  K6: "6.kyu",
  K5: "5.kyu",
  K4: "4.kyu",
  K3: "3.kyu",
  K2: "2.kyu",
  K1: "1.kyu",
  D1: "1.dan",
  D2: "2.dan",
  D3: "3.dan",
  D4: "4.dan",
  D5: "5.dan",
  D6: "6.dan",
  D7: "7.dan",
  D8: "8.dan",
  D9: "9.dan",
  D10: "10.dan",
};

export function judoGradeLabel(grade: JudoGrade | null | undefined): string | null {
  if (!grade) return null;
  return GRADE_LABEL[grade];
}

const GRADE_EMOJI: Record<JudoGrade, string> = {
  K6: "⚪",
  K5: "🟡",
  K4: "🟠",
  K3: "🟢",
  K2: "🔵",
  K1: "🟤",
  D1: "⚫", D2: "⚫", D3: "⚫", D4: "⚫", D5: "⚫",
  D6: "⚫", D7: "⚫", D8: "⚫", D9: "⚫", D10: "⚫",
};

export function judoGradeEmoji(grade: JudoGrade | null | undefined): string {
  if (!grade) return "";
  return GRADE_EMOJI[grade];
}

/**
 * Compact weight-class label used in tables and badges.
 *   -66 → "-66kg"
 *   100 → "+100kg"
 */
export function weightClassLabel(weightClass: number | null | undefined): string {
  if (weightClass == null) return "";
  if (weightClass < 0) return `${weightClass}kg`;
  return `+${weightClass}kg`;
}

/**
 * Verbose locale-aware weight-class label used by press output and tooltips.
 *   -66, "fi" → "alle 66 kg"
 *   +100, "en" → "over 100 kg"
 */
export function weightClassVerbose(weightClass: number, locale: string): string {
  const isFi = locale === "fi";
  const abs = Math.abs(weightClass);
  if (weightClass < 0) return isFi ? `alle ${abs} kg` : `under ${abs} kg`;
  return isFi ? `yli ${abs} kg` : `over ${abs} kg`;
}

/** "{ageCategoryCode} {weightClassLabel}" — falls back gracefully when either part is missing. */
export function categoryDisplay(
  ageCategoryCode: string | null | undefined,
  weightClass: number | null | undefined,
): string {
  return [ageCategoryCode ?? "", weightClassLabel(weightClass)].filter(Boolean).join(" ").trim();
}

const ALPHA3_TO_2: Record<string, string> = {
  FIN: "FI", SWE: "SE", NOR: "NO", DNK: "DK", EST: "EE", LVA: "LV", LTU: "LT",
  RUS: "RU", BLR: "BY", POL: "PL", DEU: "DE", FRA: "FR", GBR: "GB", NED: "NL",
  NLD: "NL", BEL: "BE", AUT: "AT", CHE: "CH", ITA: "IT", ESP: "ES", PRT: "PT",
  HUN: "HU", CZE: "CZ", SVK: "SK", SVN: "SI", HRV: "HR", SRB: "RS", ROU: "RO",
  BGR: "BG", UKR: "UA", GEO: "GE", AZE: "AZ", ARM: "AM", KAZ: "KZ", MNG: "MN",
  JPN: "JP", KOR: "KR", CHN: "CN", BRA: "BR", USA: "US", CAN: "CA", AUS: "AU",
};

export function countryFlag(code: string | null | undefined): string {
  if (!code) return "";
  const alpha2 = ALPHA3_TO_2[code.toUpperCase()] ?? (code.length === 2 ? code.toUpperCase() : null);
  if (!alpha2) return "";
  return [...alpha2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

export function genderLabel(gender: Gender, locale: string): string {
  const isFi = locale === "fi";
  if (gender === "MALE") return isFi ? "Mies" : "Male";
  if (gender === "FEMALE") return isFi ? "Nainen" : "Female";
  return isFi ? "Ei tiedossa" : "Unknown";
}
