export interface CompetitorItem {
  id: string;
  name: string;
  club: string | null;
  country: string | null;
  beltRank: string | null;
  birthYear: number | null;
  weightCategory: string;
  ageCategory: string | null;
}

export interface ResultItem {
  id: string;
  competitionId: string;
  athleteName: string;
  club: string | null;
  weightCategory: string;
  ageCategory: string | null;
  gender: string;
  placement: number;
  createdAt: string;
}

export interface MatchItem {
  id: string;
  competitionId: string;
  athlete1Name: string;
  athlete2Name: string;
  athlete1Club: string | null;
  athlete2Club: string | null;
  athlete1Score: number | null;
  athlete2Score: number | null;
  winnerName: string | null;
  weightCategory: string;
  ageCategory: string | null;
  gender: string;
  round: string | null;
  createdAt: string;
}

export interface VideoFeedItem {
  id: string;
  name: string;
  url: string;
}

export interface TabData {
  status: string;
  registeredCount: number;
  capacity: number | null;
  competitors: CompetitorItem[];
  results: ResultItem[];
  matches: MatchItem[];
  videoFeeds: VideoFeedItem[];
}

interface CacheEntry {
  data: TabData;
  /** Serialized response body — used for cheap change detection */
  json: string;
  fetchedAt: number;
}

export const STALE_MS = 60_000;

const cache = new Map<string, CacheEntry>();
/** In-flight request deduplication — prevents duplicate concurrent fetches (e.g. React StrictMode). */
const inflight = new Map<string, Promise<{ data: TabData; changed: boolean }>>();

export function emptyTabData(): TabData {
  return {
    status: "",
    registeredCount: 0,
    capacity: null,
    competitors: [],
    results: [],
    matches: [],
    videoFeeds: [],
  };
}

export function getCached(slug: string): TabData | null {
  return cache.get(slug)?.data ?? null;
}

export function isStale(slug: string): boolean {
  const entry = cache.get(slug);
  if (!entry) return true;
  return Date.now() - entry.fetchedAt > STALE_MS;
}

/**
 * Fetch tab data from the API, update the cache, and return whether
 * the payload changed since the last fetch.
 *
 * - 404: returns empty TabData (competition exists in routing but not yet in DB).
 * - Other non-2xx: throws so the caller can preserve stale data.
 */
export function fetchTabs(slug: string): Promise<{ data: TabData; changed: boolean }> {
  const existing = inflight.get(slug);
  if (existing) return existing;
  const promise = _doFetch(slug).finally(() => inflight.delete(slug));
  inflight.set(slug, promise);
  return promise;
}

async function _doFetch(slug: string): Promise<{ data: TabData; changed: boolean }> {
  const url = `/api/competitions/${encodeURIComponent(slug)}/tabs`;

  if (process.env.NODE_ENV === "development") {
    console.log(`[tabs cache] fetching ${url}`);
  }

  const res = await fetch(url, { cache: "no-store" });

  if (process.env.NODE_ENV === "development") {
    console.log(`[tabs cache] ${url} → ${res.status}`);
  }

  if (res.status === 404) {
    const empty = emptyTabData();
    const json = JSON.stringify(empty);
    const prev = cache.get(slug);
    cache.set(slug, { data: empty, json, fetchedAt: Date.now() });
    return { data: empty, changed: !prev };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.text();

  if (process.env.NODE_ENV === "development") {
    try {
      const parsed = JSON.parse(json) as TabData;
      console.log(
        `[tabs cache] ${slug} — ${parsed.competitors.length} competitors, ` +
        `${parsed.results.length} results, ${parsed.matches.length} matches, ` +
        `${parsed.videoFeeds.length} feeds`,
      );
    } catch { /* ignore */ }
  }

  const data: TabData = JSON.parse(json);
  const prev = cache.get(slug);
  const changed = !prev || prev.json !== json;
  cache.set(slug, { data, json, fetchedAt: Date.now() });
  return { data, changed };
}
