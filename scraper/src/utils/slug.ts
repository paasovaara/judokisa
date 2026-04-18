import slugify from "slugify";

/**
 * Generate a URL-safe slug from a competition name and year.
 * e.g. "Samurai Cup 2" + 2026 → "samurai-cup-2-2026"
 * Appends sourceId if needed to guarantee uniqueness.
 */
export function makeSlug(name: string, year: number, sourceId?: string): string {
  const base = slugify(name, { lower: true, strict: true, locale: "fi" });
  const withYear = `${base}-${year}`;
  return sourceId ? `${withYear}-${sourceId}` : withYear;
}
