import axios from "axios";
import * as cheerio from "cheerio";
import { splitName, parseWeightClass, parseJudoGrade } from "../utils/parse.js";

const BASE_URL = "https://judokisa.fi";

export interface CompetitionDetail {
  venue: string | null;
  description: string | null;
  registrationUrl: string | null;
}

export interface ResultRow {
  firstName: string;
  lastName: string;
  clubName: string | null;
  weightClass: number | null;
  ageCategory: string | null;
  gender: "MALE" | "FEMALE";
  placement: number;
}

export interface CompetitorRow {
  firstName: string;
  lastName: string;
  country: string | null;
  clubName: string | null;
  judoGrade: string | null;        // JudoGrade enum value, e.g. "K4" or "D1"
  gender: "MALE" | "FEMALE";
  yearOfBirth: number | null;
  weightClass: number | null;
  ageCategory: string | null;
}

export interface VideoFeedRow {
  name: string; // "Tatami 1", "Tatami 2" …
  url: string;
}

/**
 * Scrape the info iframe for venue / description.
 */
export async function scrapeDetail(sourceId: string): Promise<CompetitionDetail> {
  const detail: CompetitionDetail = {
    venue: null,
    description: null,
    registrationUrl: null,
  };

  try {
    const mediaUrl = `${BASE_URL}/media/${sourceId}/index.html`;
    const { data: mediaHtml } = await axios.get(mediaUrl, { timeout: 10_000 }).catch(() => ({
      data: "",
    }));

    if (mediaHtml) {
      const $m = cheerio.load(mediaHtml);
      const bodyText = $m("body").text();
      const venueMatch = bodyText.match(/([A-ZÄÖÅ][^\n,]+(?:halli|areena|kenttä|sali|aukio)[^\n,]*)/i);
      if (venueMatch) detail.venue = venueMatch[1].trim();

      $m("a[href]").each((_, el) => {
        const href = $m(el).attr("href") ?? "";
        if (
          !detail.registrationUrl &&
          (href.includes("suomisport") || href.includes("ijf.org") || href.includes("smoothcomp"))
        ) {
          detail.registrationUrl = href;
        }
      });

      const cleanText = bodyText.replace(/\s+/g, " ").trim();
      if (cleanText.length > 20) {
        detail.description = cleanText.substring(0, 500);
      }
    }
  } catch {
    // Info page unavailable — skip silently
  }

  return detail;
}

/**
 * Scrape the video tab at /continfo/video/{id}/.
 * The page embeds a JS array: var tatamis = ['url1', '', 'url2', ...]
 * Buttons are labelled "Tatami 1", "Tatami 2" etc. matching array indices.
 */
export async function scrapeVideoFeeds(sourceId: string): Promise<VideoFeedRow[]> {
  let html: string;
  try {
    const { data } = await axios.get(`${BASE_URL}/continfo/video/${sourceId}/`, { timeout: 10_000 });
    html = data;
  } catch {
    return [];
  }

  const match = html.match(/var\s+tatamis\s*=\s*(\[[\s\S]*?\])/);
  if (!match) return [];

  let urls: string[];
  try {
    // Strip trailing commas (valid JS but not valid JSON)
    const normalized = match[1].replace(/,(\s*[\]}])/g, "$1");
    urls = JSON.parse(normalized) as string[];
  } catch {
    return [];
  }

  return urls
    .map((url, i) => ({ name: `Tatami ${i + 1}`, url: url.trim() }))
    .filter((feed) => feed.url.length > 0);
}

/**
 * Scrape registered competitors at /continfo/showcontest2/{id}/.
 * Table columns (by index): Name · Country · Club · Belt rank · Gender · Birth year · Category
 */
export async function scrapeCompetitors(sourceId: string): Promise<CompetitorRow[]> {
  let html: string;
  try {
    const { data } = await axios.get(`${BASE_URL}/continfo/showcontest2/${sourceId}/`, {
      timeout: 15_000,
    });
    html = data;
  } catch {
    return [];
  }

  const $ = cheerio.load(html);
  const rows: CompetitorRow[] = [];

  $("#contest_table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 7) return;

    const fullName = cells.eq(0).text().trim();
    if (!fullName) return;
    const { firstName, lastName } = splitName(fullName);

    const country = cells.eq(1).text().trim() || null;
    const clubName = cells.eq(2).text().trim() || null;
    const judoGrade = parseJudoGrade(cells.eq(3).text().trim());
    const genderRaw = cells.eq(4).text().trim().toLowerCase();
    const gender: "MALE" | "FEMALE" = genderRaw === "nainen" || genderRaw === "n" ? "FEMALE" : "MALE";
    const yearRaw = parseInt(cells.eq(5).text().trim(), 10);
    const yearOfBirth = isNaN(yearRaw) ? null : yearRaw;
    const category = cells.eq(6).text().trim();

    // Parse weight class from Finnish: "alle 46 kg" → -46, "yli 100 kg" → 100
    const weightMatch = category.match(/(alle|yli)\s+(\d+)\s*kg/i);
    let weightClass: number | null;
    let ageCategory: string | null;
    if (weightMatch) {
      weightClass = parseWeightClass(weightMatch[0]);
      ageCategory = category.replace(weightMatch[0], "").trim() || null;
    } else {
      const fallbackMatch = category.match(/[+-]?\d+\s*kg/i);
      weightClass = fallbackMatch ? parseWeightClass(fallbackMatch[0]) : null;
      ageCategory = fallbackMatch ? category.replace(fallbackMatch[0], "").trim() || null : category || null;
    }

    rows.push({ firstName, lastName, country, clubName, judoGrade, gender, yearOfBirth, weightClass, ageCategory });
  });

  return rows;
}

/**
 * Scrape the results tab at /continfo/results/{id}/.
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

  const table = $("#contest_table");
  if (!table.length) return [];

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
    const { firstName, lastName } = splitName(athleteName);

    const clubName = cells.eq(clubCol).text().trim() || null;
    const category = cells.eq(categoryCol).text().trim() || "–";

    const gender: "MALE" | "FEMALE" = /\bN\b|nainen|women|nais|girl|female/i.test(category)
      ? "FEMALE"
      : "MALE";

    const weightMatch = category.match(/[+-]?\d+\s*kg/i);
    const weightClass = weightMatch ? parseWeightClass(weightMatch[0]) : null;
    const ageCategory = weightMatch ? category.replace(weightMatch[0], "").trim() || null : category || null;

    rows.push({ firstName, lastName, clubName, weightClass, ageCategory, gender, placement });
  });

  return rows;
}
