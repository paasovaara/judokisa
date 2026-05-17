import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSupabaseSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// Compose next-intl locale routing with Supabase Auth session refresh. The
// Supabase refresh is a no-op when env vars are not set (local dev with the
// mock session scaffold). See docs/deployment-and-auth.md §4.2.
export default async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: [
    // Match all pathnames except static files, Next.js internals, and API routes
    "/((?!_next|_vercel|api|.*\\..*).*)",
  ],
};
