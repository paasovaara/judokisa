"use client";

import { useState } from "react";

export interface CompetitorRow {
  id: string;
  name: string;
  club: string | null;
  country: string | null;
  beltRank: string | null;
  birthYear: number | null;
  weightCategory: string;
  ageCategory: string | null;
}

type SortKey = "name" | "club" | "category" | "country" | "beltRank" | "birthYear";

interface Props {
  competitors: CompetitorRow[];
  locale: string;
}

const HEADERS: { key: SortKey; fi: string; en: string }[] = [
  { key: "name",      fi: "Nimi",        en: "Name" },
  { key: "club",      fi: "Seura",       en: "Club" },
  { key: "category",  fi: "Sarja",       en: "Category" },
  { key: "country",   fi: "Maa",         en: "Country" },
  { key: "beltRank",  fi: "Vyöarvo",     en: "Belt" },
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
  const alpha2 = (ALPHA3_TO_2[code.toUpperCase()] ?? (code.length === 2 ? code.toUpperCase() : null));
  if (!alpha2) return "";
  return [...alpha2.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// Judo kyu/dan belt colour emojis
const BELT_EMOJI: [RegExp, string][] = [
  [/6\.?\s*kyu/i, "⚪"], // white
  [/5\.?\s*kyu/i, "🟡"], // yellow
  [/4\.?\s*kyu/i, "🟠"], // orange
  [/3\.?\s*kyu/i, "🟢"], // green
  [/2\.?\s*kyu/i, "🔵"], // blue
  [/1\.?\s*kyu/i, "🟤"], // brown
  [/\d+\.?\s*dan/i, "⚫"], // black (all dan grades)
];

function beltEmoji(rank: string): string {
  for (const [re, emoji] of BELT_EMOJI) {
    if (re.test(rank)) return emoji;
  }
  return "";
}

function getVal(c: CompetitorRow, key: SortKey): string | number {
  if (key === "category") {
    return `${c.ageCategory ?? ""} ${c.weightCategory}`.trim();
  }
  return c[key] ?? "";
}

export default function CompetitorTable({ competitors, locale }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [asc, setAsc] = useState(true);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setAsc((a) => !a);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const sorted = [...competitors].sort((a, b) => {
    const av = getVal(a, sortKey);
    const bv = getVal(b, sortKey);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return asc ? cmp : -cmp;
  });

  return (
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
                {locale === "fi" ? h.fi : h.en}
                {sortKey === h.key && (
                  <span className="ml-1 text-primary">{asc ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="py-2.5 pl-4 pr-6 font-medium text-gray-900">{c.name}</td>
              <td className="py-2.5 pr-6 text-gray-600">{c.club ?? "–"}</td>
              <td className="py-2.5 pr-6 text-gray-600">
                {`${c.ageCategory ?? ""} ${c.weightCategory}`.trim()}
              </td>
              <td className="py-2.5 pr-6 text-gray-500">
                {c.country
                  ? <span className="inline-flex items-center gap-1.5">{countryFlag(c.country)} {c.country}</span>
                  : "–"}
              </td>
              <td className="py-2.5 pr-6 text-gray-500">
                {c.beltRank
                  ? <span className="inline-flex items-center gap-1.5">{beltEmoji(c.beltRank)} {c.beltRank}</span>
                  : "–"}
              </td>
              <td className="py-2.5 pr-6 text-gray-500">{c.birthYear ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
