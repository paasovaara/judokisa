"use client";

import { useMemo, useState } from "react";
import type { CompetitorItem } from "@/lib/competitionTabCache";
import {
  fullName,
  judoGradeEmoji,
  judoGradeLabel,
  countryFlag,
  weightClassLabel,
} from "@/lib/format";

export type CompetitorRow = CompetitorItem;

type SortKey = "name" | "club" | "category" | "country" | "judoGrade" | "yearOfBirth" | "gender";
type FilterKey = "name" | "club" | "category" | "country" | "judoGrade" | "yearOfBirth";

const SORT_PRIORITY: SortKey[] = ["name", "category", "club", "judoGrade", "yearOfBirth", "gender"];
const TEXT_FILTER_KEYS = new Set<FilterKey>(["name", "club"]);

interface Props {
  competitors: CompetitorRow[];
  locale: string;
}

const HEADERS: { key: SortKey; fi: string; en: string }[] = [
  { key: "name",        fi: "Nimi",         en: "Name" },
  { key: "club",        fi: "Seura",        en: "Club" },
  { key: "category",    fi: "Sarja",        en: "Category" },
  { key: "country",     fi: "Maa",          en: "Country" },
  { key: "judoGrade",   fi: "Vyöarvo",      en: "Belt" },
  { key: "yearOfBirth", fi: "Syntymävuosi", en: "Born" },
];

function categoryKey(c: CompetitorRow, locale: string): string {
  const code = c.category ? (locale === "fi" ? c.category.nameFi : c.category.nameEn) : "";
  return `${code} ${weightClassLabel(c.weightClass)}`.trim();
}

function getVal(c: CompetitorRow, key: SortKey, locale: string): string | number {
  switch (key) {
    case "name":
      return `${c.lastName} ${c.firstName}`.toLowerCase();
    case "club":
      return c.clubName ?? "";
    case "category":
      return categoryKey(c, locale);
    case "country":
      return c.country ?? "";
    case "judoGrade":
      return c.judoGrade ?? "";
    case "yearOfBirth":
      return c.yearOfBirth ?? 0;
    case "gender":
      return c.gender;
  }
}

function multiSort(a: CompetitorRow, b: CompetitorRow, primary: SortKey, asc: boolean, locale: string): number {
  const av = getVal(a, primary, locale);
  const bv = getVal(b, primary, locale);
  const cmp = av < bv ? -1 : av > bv ? 1 : 0;
  if (cmp !== 0) return asc ? cmp : -cmp;

  for (const key of SORT_PRIORITY) {
    if (key === primary) continue;
    const av2 = getVal(a, key, locale);
    const bv2 = getVal(b, key, locale);
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

  const enumOptions = useMemo<string[]>(() => {
    if (TEXT_FILTER_KEYS.has(filterKey)) return [];
    const vals = competitors
      .map((c) => String(getVal(c, filterKey, locale)))
      .filter((v) => v !== "" && v !== "0");
    return [...new Set(vals)].sort();
  }, [competitors, filterKey, locale]);

  const filtered = useMemo(() => {
    if (!filterValue) return competitors;
    return competitors.filter((c) => {
      const val = String(getVal(c, filterKey, locale));
      if (TEXT_FILTER_KEYS.has(filterKey)) {
        return val.toLowerCase().includes(filterValue.toLowerCase());
      }
      return val === filterValue;
    });
  }, [competitors, filterKey, filterValue, locale]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => multiSort(a, b, sortKey, asc, locale)),
    [filtered, sortKey, asc, locale],
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
              } else if (filterKey === "judoGrade") {
                const emoji = judoGradeEmoji(v as Parameters<typeof judoGradeEmoji>[0]);
                const text = judoGradeLabel(v as Parameters<typeof judoGradeLabel>[0]) ?? v;
                label = `${emoji} ${text}`.trim();
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
              sorted.map((c) => {
                const gradeText = judoGradeLabel(c.judoGrade as Parameters<typeof judoGradeLabel>[0]);
                const gradeEmoji = judoGradeEmoji(c.judoGrade as Parameters<typeof judoGradeEmoji>[0]);
                return (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-6 font-medium">
                      <a
                        href={`/${locale}/athletes/${c.id}`}
                        className="text-primary-light hover:underline"
                      >
                        {fullName(c.firstName, c.lastName)}
                      </a>
                    </td>
                    <td className="py-2.5 pr-6 text-gray-600">{c.clubName ?? "–"}</td>
                    <td className="py-2.5 pr-6 text-gray-600">{categoryKey(c, locale) || "–"}</td>
                    <td className="py-2.5 pr-6 text-gray-500">
                      {c.country ? (
                        <span className="inline-flex items-center gap-1.5">
                          {countryFlag(c.country)} {c.country}
                        </span>
                      ) : "–"}
                    </td>
                    <td className="py-2.5 pr-6 text-gray-500">
                      {gradeText ? (
                        <span className="inline-flex items-center gap-1.5">
                          {gradeEmoji} {gradeText}
                        </span>
                      ) : "–"}
                    </td>
                    <td className="py-2.5 pr-6 text-gray-500">{c.yearOfBirth ?? "–"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
