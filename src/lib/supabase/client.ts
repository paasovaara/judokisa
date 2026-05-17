// Browser-side Supabase client. Use for client components that need to call
// auth APIs directly (sign-in, sign-out triggered from interactive UI).
// Throws if Supabase is not configured — callers that may run before the env
// is wired should guard with `process.env.NEXT_PUBLIC_SUPABASE_URL`.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase env not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  cached = createBrowserClient(url, anon);
  return cached;
}
