# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (http://localhost:3000)
npm run build      # production build + type check
npm run lint       # ESLint

npx prisma validate          # validate schema
npx prisma migrate dev       # apply migrations (requires DATABASE_URL)
npx prisma generate          # regenerate Prisma client after schema changes
npx prisma studio            # browse DB in browser
```

The app redirects `/` → `/fi` automatically via next-intl middleware.

## Architecture

**Read-only frontend.** This app only reads from the database. All writes come from the scraper in `scraper/`. The flow is:

```
scraper/ → PostgreSQL (Supabase) ← Next.js frontend
```

Future: a CMS will replace the scraper; auth/registration will be added as a separate layer.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS v4 · Prisma v7 · next-intl

## Key files

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | Data models: `Competition`, `Result`, `Match` |
| `prisma.config.ts` | Prisma v7 config — DB URL lives here (via `DATABASE_URL` env) |
| `src/lib/db.ts` | Singleton Prisma client |
| `src/proxy.ts` | next-intl locale routing proxy (Next.js 16 renamed middleware → proxy) |
| `src/i18n/routing.ts` | Locale list (`fi`, `en`) and default locale |
| `src/i18n/request.ts` | Server-side i18n config |
| `src/messages/fi.json` | Finnish translations |
| `src/messages/en.json` | English translations |
| `src/app/globals.css` | Tailwind v4 theme (custom colors via `@theme`) |

## Route structure

```
/[locale]/                          → Home (hero, upcoming, latest results)
/[locale]/competitions              → Competition list (filterable, paginated)
/[locale]/competitions/[slug]       → Competition detail (info, results, video)
/[locale]/history                   → Competitor history / head-to-head search
```

Routes are server components that query Prisma directly. Client components are co-located and named `*Filters.tsx` / `*Search.tsx`.

## Tailwind colors

Custom tokens defined in `src/app/globals.css` via `@theme inline`:
- `primary` (#003580) — nav, headings, buttons
- `primary-light` (#0693e3) — links, accents
- `primary-dark` (#002060) — hero bg, footer
- `success` / `warning` / `danger` — status indicators

## i18n

All UI strings are in `src/messages/{fi,en}.json`. Keys mirror component structure (e.g. `competitions.title`, `types.TOURNAMENT`). Data values (athlete names, city names) are stored and displayed as-is. Add new strings to both files when adding UI.

## Prisma notes

- Prisma v7: `url` is **not** in `schema.prisma` — it's in `prisma.config.ts` via `DATABASE_URL`
- Prisma v7 dropped the binary engine; `src/lib/db.ts` uses `@prisma/adapter-pg` for the connection
- After editing `schema.prisma`, run `npx prisma generate` to update the client
- The generated client outputs to the default location (`node_modules/@prisma/client`)
- `DATABASE_URL` format: `postgresql://user:password@host:5432/dbname?schema=public`
