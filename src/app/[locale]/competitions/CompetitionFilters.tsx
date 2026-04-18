"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import SearchInput from "@/components/SearchInput";

interface CompetitionFiltersProps {
  tab: string;
  q: string;
  type: string;
  typeOptions: { value: string; label: string }[];
  labels: {
    upcoming: string;
    past: string;
    searchPlaceholder: string;
    filterType: string;
    allTypes: string;
  };
}

export default function CompetitionFilters({
  tab,
  q,
  type,
  typeOptions,
  labels,
}: CompetitionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setParam("tab", t === "upcoming" ? "" : t)}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "upcoming" ? labels.upcoming : labels.past}
          </button>
        ))}
      </div>

      {/* Search + type filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          placeholder={labels.searchPlaceholder}
          defaultValue={q}
          className="flex-1"
        />
        <select
          value={type}
          onChange={(e) => setParam("type", e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light sm:w-48"
        >
          <option value="">{labels.allTypes}</option>
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
