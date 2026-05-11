"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

interface Props {
  searchPlaceholder: string;
  roleLabel: string;
  statusLabel: string;
  roleOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
}

export default function UsersFilters({
  searchPlaceholder,
  roleLabel,
  statusLabel,
  roleOptions,
  statusOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function update(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-3 ${pending ? "opacity-70" : ""}`}>
      <input
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder={searchPlaceholder}
        onChange={(e) => update("q", e.target.value)}
        className="min-w-[14rem] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{roleLabel}</span>
        <select
          defaultValue={params.get("role") ?? ""}
          onChange={(e) => update("role", e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">—</option>
          {roleOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{statusLabel}</span>
        <select
          defaultValue={params.get("status") ?? ""}
          onChange={(e) => update("status", e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">—</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
