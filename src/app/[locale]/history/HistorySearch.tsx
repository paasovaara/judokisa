"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

interface HistorySearchProps {
  q: string;
  q2: string;
  labels: {
    athlete1: string;
    athlete2: string;
    search: string;
  };
}

export default function HistorySearch({ q, q2, labels }: HistorySearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [val1, setVal1] = useState(q);
  const [val2, setVal2] = useState(q2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (val1.trim()) params.set("q", val1.trim().toUpperCase());
    if (val2.trim()) params.set("q2", val2.trim().toUpperCase());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={val1}
          onChange={(e) => setVal1(e.target.value)}
          placeholder={labels.athlete1}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
        />
        <input
          type="text"
          value={val2}
          onChange={(e) => setVal2(e.target.value)}
          placeholder={labels.athlete2}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-light focus:outline-none focus:ring-1 focus:ring-primary-light"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {labels.search}
        </button>
      </div>
    </form>
  );
}
