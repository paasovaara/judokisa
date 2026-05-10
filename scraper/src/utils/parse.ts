/**
 * Parse a Finnish/ISO date string into a JS Date.
 * Handles: "YYYY-MM-DD", "D.M.YYYY", "DD.MM.YYYY"
 */
export function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s || s === "-") return null;

  // ISO format: 2026-04-18
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T12:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }

  // Finnish format: 18.4.2026 or 18.04.2026
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d = new Date(`${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T12:00:00Z`);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Parse a capacity string like "164/360" → { registered: 164, capacity: 360 }
 */
export function parseCapacity(raw: string): { registered: number; capacity: number } | null {
  const m = raw.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  return { registered: parseInt(m[1], 10), capacity: parseInt(m[2], 10) };
}

/**
 * Infer competition type from the name (Finnish keywords)
 */
export function inferType(name: string): string {
  const n = name.toLowerCase();
  if (/\bsm-|\bmestaruus|championship/i.test(n)) return "CHAMPIONSHIP";
  if (/\bkata\b/i.test(n)) return "KATA";
  if (/\bleiri\b|\bcamp\b/i.test(n)) return "CAMP";
  if (/\bopen\b/i.test(n)) return "OPEN";
  if (/nordic|baltic|international|kansainvälinen|pohjoismaiden/i.test(n)) return "INTERNATIONAL";
  return "TOURNAMENT";
}

/**
 * Infer competition status from its dates
 */
export function inferStatus(dateStart: Date, dateEnd: Date): string {
  const now = new Date();
  if (dateEnd < now) return "COMPLETED";
  if (dateStart <= now) return "ONGOING";
  return "UPCOMING";
}

/**
 * Split a combined "First Last" or "First Middle Last" name into firstName + lastName.
 * Heuristic: the last whitespace-delimited token is the last name, the rest is first name.
 * Falls back to ("", trimmed) if no whitespace is present.
 */
export function splitName(combined: string): { firstName: string; lastName: string } {
  const trimmed = combined.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const idx = trimmed.lastIndexOf(" ");
  if (idx < 0) return { firstName: "", lastName: trimmed };
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1),
  };
}

/**
 * Parse a compact weight class label into an integer.
 *   "-46kg" → -46
 *   "+100kg" → 100
 *   "alle 46 kg" → -46
 *   "yli 100 kg" → 100
 */
export function parseWeightClass(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  const m = s.match(/(alle|yli|under|over|[+-]?)\s*(\d+)/);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  if (isNaN(n)) return null;
  const lead = m[1];
  if (lead === "alle" || lead === "under" || lead === "-") return -n;
  if (lead === "yli" || lead === "over" || lead === "+") return n;
  // Bare number → assume "under" (most common in Finnish judo notation)
  return -n;
}

/**
 * Parse a belt-rank string into a `JudoGrade` enum value.
 *   "6.kyu" → "K6"        "1 kyu" → "K1"
 *   "1.dan" → "D1"        "10 dan" → "D10"
 *   anything else → null
 */
export function parseJudoGrade(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  const kyu = s.match(/(\d+)\s*\.?\s*kyu/);
  if (kyu) {
    const n = parseInt(kyu[1], 10);
    if (n >= 1 && n <= 6) return `K${n}`;
  }
  const dan = s.match(/(\d+)\s*\.?\s*dan/);
  if (dan) {
    const n = parseInt(dan[1], 10);
    if (n >= 1 && n <= 10) return `D${n}`;
  }
  return null;
}
