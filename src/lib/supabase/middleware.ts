// Edge-middleware Supabase client. Refreshes the auth session cookie on
// each request before the page handler runs. Called from src/proxy.ts so it
// composes with the next-intl locale routing.
//
// When Supabase env is not configured, this is a no-op pass-through.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet as Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>) {
          response.cookies.set(name, value);
        }
      },
    },
  });

  // Touching getUser() forces the SSR client to refresh the access token if
  // it has expired, and write the refreshed cookies onto `response`.
  await supabase.auth.getUser();

  return response;
}
