// Server-side Supabase client (RSC and server actions). Reads session
// cookies via `@supabase/ssr`. Returns `null` when Supabase env vars are not
// configured — callers must handle the absence gracefully so the existing
// mock-session scaffold can still drive local development until the auth
// env is wired (see docs/deployment-and-auth.md §5.2).

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Next 15+ server actions/RSC can write cookies via cookies().set().
          // In a pure RSC pass we may be in a read-only context; swallow the
          // error so non-mutating reads don't crash. The middleware proxy
          // (src/proxy.ts) handles refresh and is the canonical write path.
          try {
            for (const { name, value, options } of cookiesToSet as Array<{
              name: string;
              value: string;
              options: CookieOptions;
            }>) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Read-only context; ignore.
          }
        },
      },
    },
  );
}
