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
