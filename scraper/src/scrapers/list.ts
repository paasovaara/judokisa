import axios from "axios";
import * as cheerio from "cheerio";
import { parseDate, parseCapacity, inferType, inferStatus } from "../utils/parse.js";
import { makeSlug } from "../utils/slug.js";

const BASE_URL = "https://judokisa.fi";

export interface CompetitionListItem {
  sourceId: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  dateStart: Date;
  dateEnd: Date;
  city: string;
  registrationDeadline: Date | null;
  registeredCount: number;
  capacity: number | null;
}

/**
 * Scrape the judokisa.fi main page and return all competition rows.
 * The fancyTable plugin renders all rows in the HTML — no pagination needed.
 */
export async function scrapeCompetitionList(): Promise<CompetitionListItem[]> {
  console.log(`Fetching competition list from ${BASE_URL}...`);
  const { data } = await axios.get(BASE_URL, {
    headers: { "Accept-Language": "fi" },
    timeout: 15_000,
  });

  const $ = cheerio.load(data);
  const results: CompetitionListItem[] = [];

  // judokisa.fi uses a single #contest_table for all competitions (upcoming + past)
  $("#contest_table tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    // Column layout (observed): Name | City | Date | Deadline | Capacity | (icon?)
    const nameCell = cells.eq(0);
    const link = nameCell.find("a").attr("href") ?? "";
    const name = nameCell.find("a").text().trim() || nameCell.text().trim();

    // Extract source ID from href: /continfo/showcontest2/1180/
    const idMatch = link.match(/\/(\d+)\/?$/);
    if (!idMatch || !name) return;
    const sourceId = idMatch[1];

    const city = cells.eq(1).text().trim();
    const rawDate = cells.eq(2).text().trim();
    const rawDeadline = cells.length > 3 ? cells.eq(3).text().trim() : "";
    const rawCapacity = cells.length > 4 ? cells.eq(4).text().trim() : "";

    // Date may be a single date ("2026-04-18") or a range ("2026-04-18 – 2026-04-19")
    // Split only on spaced separators to avoid splitting inside ISO dates
    const dateParts = rawDate.split(/\s+[–-]\s+/);
    const dateStart = parseDate(dateParts[0]);
    const dateEnd = parseDate(dateParts[1] ?? dateParts[0]);

    if (!dateStart || !dateEnd) return;

    const deadline = parseDate(rawDeadline);
    const cap = parseCapacity(rawCapacity);
    const type = inferType(name);
    const status = inferStatus(dateStart, dateEnd);
    const slug = makeSlug(name, dateStart.getFullYear(), sourceId);

    results.push({
      sourceId,
      name,
      slug,
      type,
      status,
      dateStart,
      dateEnd,
      city,
      registrationDeadline: deadline,
      registeredCount: cap?.registered ?? 0,
      capacity: cap?.capacity ?? null,
    });
  });

  console.log(`Found ${results.length} competitions.`);
  return results;
}
