"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  fetchTabs,
  getCached,
  isStale,
  emptyTabData,
  TabData,
  STALE_MS,
} from "@/lib/competitionTabCache";

interface ContextValue {
  /** null = fetch not yet complete (show skeleton). Non-null = ready (may be empty arrays). */
  data: TabData | null;
}

const CompetitionTabsContext = createContext<ContextValue>({ data: null });

export function useCompetitionTabs() {
  return useContext(CompetitionTabsContext);
}

export function CompetitionTabsProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<TabData | null>(() => getCached(slug));
  // Track whether we have ever successfully loaded data so the error
  // fallback does not overwrite real data with an empty placeholder.
  const hasData = useRef(data !== null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const { data: fresh, changed } = await fetchTabs(slug);
        if (!cancelled && changed) {
          hasData.current = true;
          setData(fresh);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error(`[CompetitionTabs] fetch error for "${slug}":`, err);
        }
        // Only fall back to empty state on the very first load — never
        // overwrite real data that was already displayed.
        if (!cancelled && !hasData.current) {
          hasData.current = true;
          setData(emptyTabData());
        }
      }
    }

    if (isStale(slug)) refresh();

    const timer = setInterval(refresh, STALE_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [slug]);

  return (
    <CompetitionTabsContext.Provider value={{ data }}>
      {children}
    </CompetitionTabsContext.Provider>
  );
}
