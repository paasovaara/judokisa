import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://judokisa.fi";

export interface CompetitionDetail {
  venue: string | null;
  description: string | null;
  videoUrl: string | null;
  registrationUrl: string | null;
}

export interface ResultRow {
  athleteName: string;
  club: string | null;
  weightCategory: string;
  ageCategory: string | null;
  gender: "MALE" | "FEMALE";
  placement: number;
}

/**
 * Scrape the info iframe for venue / description.
 * The info tab at /continfo/showcontest0/{id}/ embeds /media/{id}/index.html
 */
export async function scrapeDetail(sourceId: string): Promise<CompetitionDetail> {
  const detail: CompetitionDetail = {
    venue: null,
    description: null,
    videoUrl: null,
    registrationUrl: null,
  };

  try {
    // 1. Info tab — fetch the iframe page
    const mediaUrl = `${BASE_URL}/media/${sourceId}/index.html`;
    const { data: mediaHtml } = await axios.get(mediaUrl, { timeout: 10_000 }).catch(() => ({
      data: "",
    }));

    if (mediaHtml) {
      const $m = cheerio.load(mediaHtml);
      // Extract venue: look for address patterns in text
      const bodyText = $m("body").text();
      const venueMatch = bodyText.match(/([A-ZÄÖÅ][^\n,]+(?:halli|areena|kenttä|sali|aukio)[^\n,]*)/i);
      if (venueMatch) detail.venue = venueMatch[1].trim();

      // Extract first external registration link (Suomisport, ijf, etc.)
      $m("a[href]").each((_, el) => {
        const href = $m(el).attr("href") ?? "";
        if (
          !detail.registrationUrl &&
          (href.includes("suomisport") || href.includes("ijf.org") || href.includes("smoothcomp"))
        ) {
          detail.registrationUrl = href;
        }
      });

      // Store a trimmed description (first 500 chars of meaningful body text)
      const cleanText = bodyText.replace(/\s+/g, " ").trim();
      if (cleanText.length > 20) {
        detail.description = cleanText.substring(0, 500);
      }
    }
  } catch {
    // Info page unavailable — skip silently
  }

  try {
    // 2. Video tab
    const { data: videoHtml } = await axios.get(`${BASE_URL}/continfo/video/${sourceId}/`, {
      timeout: 10_000,
    });
    const $v = cheerio.load(videoHtml);

    // Look for YouTube iframe src or anchor href
    const iframeSrc = $v("iframe[src*='youtube']").attr("src");
    if (iframeSrc) {
      detail.videoUrl = iframeSrc.replace("embed/", "watch?v=");
    } else {
      $v("a[href*='youtube'], a[href*='youtu.be']").each((_, el) => {
        if (!detail.videoUrl) detail.videoUrl = $v(el).attr("href") ?? null;
      });
    }
  } catch {
    // No video page — skip silently
  }

  return detail;
}

/**
 * Scrape the results tab at /continfo/results/{id}/.
 *
 * judokisa.fi results tables vary by competition but typically have columns:
 *   Sija | Nimi | Seura | Sarja
 * or:
 *   Sija | Nimi | Seura | Sarja | Sukupuoli
 *
 * We do a best-effort parse:
 * - Find the column indices for placement, name, club, category dynamically
 * - Default gender to MALE unless the category contains "N"/"nainen"/"W"/"women"
 */
export async function scrapeResults(sourceId: string): Promise<ResultRow[]> {
  let html: string;
  try {
    const { data } = await axios.get(`${BASE_URL}/continfo/results/${sourceId}/`, {
      timeout: 15_000,
    });
    html = data;
  } catch {
    return [];
  }

  const $ = cheerio.load(html);
  const rows: ResultRow[] = [];

  // Locate the results table — judokisa.fi uses #contest_table
  const table = $("#contest_table");
  if (!table.length) return [];

  // Detect column indices from header row
  const headers: string[] = [];
  table.find("thead tr th, tr#hdrrow th").each((_, th) => {
    headers.push($(th).text().trim().toLowerCase());
  });

  const col = (keywords: string[]) =>
    headers.findIndex((h) => keywords.some((k) => h.includes(k)));

  const sijaIdx = col(["sija", "place", "rank"]);
  const nimiIdx = col(["nimi", "name"]);
  const seuraIdx = col(["seura", "club"]);
  const sarjaIdx = col(["sarja", "category", "division", "weight"]);

  // Fall back to positional guesses if headers not found
  const placementCol = sijaIdx >= 0 ? sijaIdx : 0;
  const nameCol = nimiIdx >= 0 ? nimiIdx : 1;
  const clubCol = seuraIdx >= 0 ? seuraIdx : 2;
  const categoryCol = sarjaIdx >= 0 ? sarjaIdx : 3;

  table.find("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 2) return;

    const placementRaw = cells.eq(placementCol).text().trim().replace(/\.$/, "");
    const placement = parseInt(placementRaw, 10);
    if (isNaN(placement)) return;

    const athleteName = cells.eq(nameCol).text().trim();
    if (!athleteName) return;

    const club = cells.eq(clubCol).text().trim() || null;
    const category = cells.eq(categoryCol).text().trim() || "–";

    // Infer gender from category name
    const gender: "MALE" | "FEMALE" = /\bN\b|nainen|women|nais|girl|female/i.test(category)
      ? "FEMALE"
      : "MALE";

    // Split category into weight + age components where possible
    // e.g. "U18 -60kg", "-66kg", "Senior -73kg"
    const weightMatch = category.match(/-?\d+\s*kg/i);
    const weightCategory = weightMatch ? weightMatch[0] : category;
    const ageCategory = category.replace(weightCategory, "").trim() || null;

    rows.push({
      athleteName,
      club,
      weightCategory,
      ageCategory,
      gender,
      placement,
    });
  });

  return rows;
}
