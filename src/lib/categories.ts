import type { CategoryGender } from "@prisma/client";

export interface DefaultCategory {
  code: string;
  nameEn: string;
  nameFi: string;
  minAge: number;
  maxAge: number;
  gender: CategoryGender;
  weightClasses: number[];
}

// Default category set from docs/requirements.md §3.
// Used to seed a new competition's category list and to populate the
// "default category / weight class" prefill dropdowns on user profiles.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { code: "M",   nameEn: "Men",       nameFi: "Miehet",     minAge: 18, maxAge: 0,  gender: "MEN",   weightClasses: [-60, -66, -73, -81, -90, -100, 100] },
  { code: "M21", nameEn: "U21 men",   nameFi: "U21 miehet", minAge: 18, maxAge: 21, gender: "MEN",   weightClasses: [-55, -60, -66, -73, -81, -90, 90] },
  { code: "P18", nameEn: "U18 boys",  nameFi: "U18 pojat",  minAge: 15, maxAge: 18, gender: "MEN",   weightClasses: [-45, -50, -60, -66, -73, -81, 81] },
  { code: "P15", nameEn: "U15 boys",  nameFi: "U15 pojat",  minAge: 13, maxAge: 15, gender: "MEN",   weightClasses: [-34, -38, -42, -46, -50, -55, -60, -66, 66] },
  { code: "P13", nameEn: "U13 boys",  nameFi: "U13 pojat",  minAge: 11, maxAge: 13, gender: "MEN",   weightClasses: [-30, -34, -38, -42, -46, -50, -55, 55] },
  { code: "P11", nameEn: "U11 boys",  nameFi: "U11 pojat",  minAge: 9,  maxAge: 11, gender: "MEN",   weightClasses: [-27, -30, -34, -38, -42, -46, -50, -55, 55] },
  { code: "N",   nameEn: "Women",     nameFi: "Naiset",     minAge: 18, maxAge: 0,  gender: "WOMEN", weightClasses: [-48, -52, -57, -63, -70, -78, 78] },
  { code: "N21", nameEn: "U21 women", nameFi: "U21 naiset", minAge: 15, maxAge: 21, gender: "WOMEN", weightClasses: [-48, -52, -57, -63, -70, 70] },
  { code: "T18", nameEn: "U18 girls", nameFi: "U18 tytöt",  minAge: 15, maxAge: 18, gender: "WOMEN", weightClasses: [-44, -48, -52, -57, -63, 63] },
  { code: "T15", nameEn: "U15 girls", nameFi: "U15 tytöt",  minAge: 13, maxAge: 15, gender: "WOMEN", weightClasses: [-32, -36, -40, -44, -48, -52, -57, -63, 63] },
  { code: "T13", nameEn: "U13 girls", nameFi: "U13 tytöt",  minAge: 11, maxAge: 13, gender: "WOMEN", weightClasses: [-28, -32, -36, -40, -44, -48, -52, 52] },
  { code: "T11", nameEn: "U11 girls", nameFi: "U11 tytöt",  minAge: 9,  maxAge: 11, gender: "WOMEN", weightClasses: [-25, -28, -32, -36, -40, -44, -48, -52, 52] },
];

export function defaultCategoryByCode(code: string): DefaultCategory | undefined {
  return DEFAULT_CATEGORIES.find((c) => c.code === code);
}

/** Union of all weight classes used by the default category set, sorted ascending. */
export function allDefaultWeightClasses(): number[] {
  const set = new Set<number>();
  for (const c of DEFAULT_CATEGORIES) for (const w of c.weightClasses) set.add(w);
  return [...set].sort((a, b) => a - b);
}

/** Format a weight-class integer for display: -60 → "−60 kg", 100 → "+100 kg". */
export function formatWeightClass(w: number): string {
  if (w < 0) return `−${Math.abs(w)} kg`;
  return `+${w} kg`;
}
