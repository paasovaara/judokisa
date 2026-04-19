"use client";

import { useMemo, useState } from "react";

export interface CompetitorRow {
  id: string;
  name: string;
  club: string | null;
  country: string | null;
  beltRank: string | null;
  birthYear: number | null;
  weightCategory: string;
  ageCategory: string | null;
  gender: string;
}

type SortKey = "name" | "club" | "category" | "country" | "beltRank" | "birthYear" | "gender";
type FilterKey = "name" | "club" | "category" | "country" | "beltRank" | "birthYear";

/**
 * Default sort priority used both for the initial render and as tie-breakers
 * when sorting by a specific column. "gender" is excluded from the header list
 * (no visible column) but still participates as the final tie-breaker.
 */
const SORT_PRIORITY: SortKey[] = ["name", "category", "club", "beltRank", "birthYear", "gender"];

/** Free-text search attributes; all others get enum dropdowns derived from the dataset. */
const TEXT_FILTER_KEYS = new Set<FilterKey>(["name", "club"]);

interface Props {
  competitors: CompetitorRow[];
  locale: string;
}

const HEADERS: { key: SortKey; fi: string; en: string }[] = [
  { key: "name",      fi: "Nimi",         en: "Name" },
  { key: "club",      fi: "Seura",        en: "Club" },
  { key: "category",  fi: "Sarja",        en: "Category" },
  { key: "country",   fi: "Maa",          en: "Country" },
  { key: "beltRank",  fi: "Vyöarvo",      en: "Belt" },
  { key: "birthYear", fi: "Syntymävuosi", en: "Born" },
];

// ISO 3166-1 alpha-3 → alpha-2 for the countries that commonly appear in Finnish judo
const ALPHA3_TO_2: Record<string, string> = {
  FIN: "FI", SWE: "SE", NOR: "NO", DNK: "DK", EST: "EE", LVA: "LV", LTU: "LT",
  RUS: "RU", BLR: "BY", POL: "PL", DEU: "DE", FRA: "FR", GBR: "GB", NED: "NL",
  NLD: "NL", BEL: "BE", AUT: "AT", CHE: "CH", ITA: "IT", ESP: "ES", PRT: "PT",
  HUN: "HU", CZE: "CZ", SVK: "SK", SVN: "SI", HRV: "HR", SRB: "RS", ROU: "RO",
  BGR: "BG", UKR: "UA", GEO: "GE", AZE: "AZ", ARM: "AM", KAZ: "KZ", MNG: "MN",
  JPN: "JP", KOR: "KR", CHN: "CN", BRA: "BR", USA: "US", CAN: "CA", AUS: "AU",
};

function countryFlag(code: string): string {
  const alpha2 = ALPHA3_TO_2[code.toUpperCase()] ?? (code.length === 2 ? code.toUpperCase() : null);
  if (!alpha2) return "";
  return [...alpha2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

const BELT_EMOJI: [RegExp, string][] = [
  [/6\.?\s*kyu/i, "⚪"],
  [/5\.?\s*kyu/i, "🟡"],
  [/4\.?\s*kyu/i, "🟠"],
  [/3\.?\s*kyu/i, "🟢"],
  [/2\.?\s*kyu/i, "🔵"],
  [/1\.?\s*kyu/i, "🟤"],
  [/\d+\.?\s*dan/i, "⚫"],
];

function beltEmoji(rank: string): string {
  for (const [re, emoji] of BELT_EMOJI) {
    if (re.test(rank)) return emoji;
  }
  return "";
}

function getVal(c: CompetitorRow, key: SortKey): string | number {
  if (key === "category") return `${c.ageCategory ?? ""} ${c.weightCategory}`.trim();
  return c[key] ?? "";
}

function multiSort(a: CompetitorRow, b: CompetitorRow, primary: SortKey, asc: boolean): number {
  const av = getVal(a, primary);
  const bv = getVal(b, primary);
  const cmp = av < bv ? -1 : av > bv ? 1 : 0;
  if (cmp !== 0) return asc ? cmp : -cmp;

  for (const key of SORT_PRIORITY) {
    if (key === primary) continue;
    const av2 = getVal(a, key);
    const bv2 = getVal(b, key);
    const cmp2 = av2 < bv2 ? -1 : av2 > bv2 ? 1 : 0;
    if (cmp2 !== 0) return cmp2;
  }
  return 0;
}

export default function CompetitorTable({ competitors, locale }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);
  const [filterKey, setFilterKey] = useState<FilterKey>("name");
  const [filterValue, setFilterValue] = useState("");

  function handleFilterKeyChange(key: FilterKey) {
    setFilterKey(key);
    setFilterValue("");
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) setAsc((a) => !a);
    else { setSortKey(key); setAsc(true); }
  }

  // Unique values for enum-style dropdowns, derived from the full dataset
  const enumOptions = useMemo<string[]>(() => {
    if (TEXT_FILTER_KEYS.has(filterKey)) return [];
    const vals = competitors
      .map((c) => String(getVal(c, filterKey)))
      .filter((v) => v !== "" && v !== "0");
    return [...new Set(vals)].sort();
  }, [competitors, filterKey]);

  const filtered = useMemo(() => {
    if (!filterValue) return competitors;
    return competitors.filter((c) => {
      const val = String(getVal(c, filterKey));
      if (TEXT_FILTER_KEYS.has(filterKey)) {
        return val.toLowerCase().includes(filterValue.toLowerCase());
      }
      return val === filterValue;
    });
  }, [competitors, filterKey, filterValue]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => multiSort(a, b, sortKey, asc)),
    [filtered, sortKey, asc],
  );

  const isFiltered = filterValue !== "";
  const isFi = locale === "fi";

  return (
    <div>
      {/* Search bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={filterKey}
          onChange={(e) => handleFilterKeyChange(e.target.value as FilterKey)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none"
        >
          {HEADERS.map((h) => (
            <option key={h.key} value={h.key}>
              {isFi ? h.fi : h.en}
            </option>
          ))}
        </select>

        {TEXT_FILTER_KEYS.has(filterKey) ? (
          <input
            type="text"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            placeholder={isFi ? "Hae…" : "Search…"}
            className="min-w-48 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary focus:outline-none"
          />
        ) : (
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="min-w-48 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none"
          >
            <option value="">{isFi ? "Kaikki" : "All"}</option>
            {enumOptions.map((v) => {
              let label = v;
              if (filterKey === "country") {
                const flag = countryFlag(v);
                if (flag) label = `${flag} ${v}`;
              } else if (filterKey === "beltRank") {
                const emoji = beltEmoji(v);
                if (emoji) label = `${emoji} ${v}`;
              }
              return <option key={v} value={v}>{label}</option>;
            })}
          </select>
        )}

        {isFiltered && (
          <button
            onClick={() => setFilterValue("")}
            aria-label={isFi ? "Tyhjennä suodatin" : "Clear filter"}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          >
            ✕
          </button>
        )}

        {isFiltered && (
          <span className="text-xs text-gray-500">
            {filtered.length} / {competitors.length}{" "}
            {isFi ? "kilpailijaa" : "athletes"}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              {HEADERS.map((h) => (
                <th
                  key={h.key}
                  className="cursor-pointer select-none whitespace-nowrap py-2.5 pl-4 pr-6 hover:text-gray-800"
                  onClick={() => handleSort(h.key)}
                >
                  {isFi ? h.fi : h.en}
                  {sortKey === h.key && (
                    <span className="ml-1 text-primary">{asc ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  className="py-8 pl-4 text-center text-sm text-gray-400"
                >
                  {isFi ? "Ei tuloksia" : "No results"}
                </td>
              </tr>
            ) : (
              sorted.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2.5 pl-4 pr-6 font-medium text-gray-900">{c.name}</td>
                  <td className="py-2.5 pr-6 text-gray-600">{c.club ?? "–"}</td>
                  <td className="py-2.5 pr-6 text-gray-600">
                    {`${c.ageCategory ?? ""} ${c.weightCategory}`.trim()}
                  </td>
                  <td className="py-2.5 pr-6 text-gray-500">
                    {c.country ? (
                      <span className="inline-flex items-center gap-1.5">
                        {countryFlag(c.country)} {c.country}
                      </span>
                    ) : "–"}
                  </td>
                  <td className="py-2.5 pr-6 text-gray-500">
                    {c.beltRank ? (
                      <span className="inline-flex items-center gap-1.5">
                        {beltEmoji(c.beltRank)} {c.beltRank}
                      </span>
                    ) : "–"}
                  </td>
                  <td className="py-2.5 pr-6 text-gray-500">{c.birthYear ?? "–"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
