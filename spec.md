# Judo Competition Platform — Application Specification

**Version:** 0.3.0
**Status:** Draft
**Last updated:** 2026-04-18

---

## 1. Overview

A mobile-first, responsive web platform for browsing Finnish judo competitions, viewing results, and accessing video feeds. This is a public read-only frontend that replaces [judokisa.fi](https://judokisa.fi). Data is populated by a separate scraper application (`scraper/`) and later by a dedicated CMS.

### 1.1 Goals

- Replace judokisa.fi with a fully responsive, mobile-first experience
- Provide fast access to competition listings, results, and video feeds without requiring login
- Establish a clean data layer (PostgreSQL) that can be written to by a scraper today and a CMS tomorrow
- Design the system so authentication, registration, and competitor stats can be layered in later without architectural changes

### 1.2 Out of scope (v1)

- User authentication and accounts
- Competition registration (in-platform — external registration links are shown)
- Competitor profiles and statistics
- Club directory
- Rankings
- Admin / CMS interface

---

## 2. System Architecture

```
┌─────────────────┐        ┌──────────────────────────┐
│  scraper/        │──────▶ │   PostgreSQL (Supabase)   │
│  (Node.js)       │  write │                           │
└─────────────────┘        └──────────────────────────┘
                                        │ read (Prisma)
                            ┌───────────▼──────────────┐
                            │   Next.js Frontend        │
                            │   (this repository)       │
                            └──────────────────────────┘
```

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **ORM**: Prisma v7 with `@prisma/adapter-pg` (shared schema, used by both frontend and scraper)
- **Database**: PostgreSQL hosted on Supabase
- **Scraper**: `scraper/` subdirectory — Node.js + Cheerio, scrapes judokisa.fi
- **Hosting**: Vercel (frontend)

The frontend only ever reads from the database. All writes originate from the scraper (v1) or the future CMS.

---

## 3. Users & Roles

In v1, all users are unauthenticated. There is one implicit role:

| Role | Description |
|------|-------------|
| **Visitor** | Any public user. Can browse competitions, view results, and follow video links. No login required. |

Future roles (not in v1):
- **Athlete** — register for competitions, view personal stats
- **Coach** — manage club registrations
- **Organizer** — create and manage competitions
- **Referee** — access draw/schedule tooling
- **Admin** — full platform access

---

## 4. Design System

### 4.1 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#003580` | Primary actions, navigation, headings |
| `primary-light` | `#0693e3` | Links, hover states, accents |
| `primary-dark` | `#002060` | Hero backgrounds, footer |
| `white` | `#ffffff` | Page backgrounds, text on dark |
| `gray-50` | `#f8f9fa` | Card backgrounds, alternating rows |
| `gray-200` | `#e2e8f0` | Borders, dividers |
| `gray-700` | `#374151` | Body text |
| `success` | `#16a34a` | Open/active status indicators |
| `warning` | `#d97706` | Closing-soon deadlines |
| `danger` | `#dc2626` | Full/closed status, errors |

### 4.2 Typography

- **Font**: Inter (Google Fonts) — clean, legible at small sizes on mobile
- **Scale**: Tailwind default type scale
- **Headings**: `font-bold`, `text-primary`

### 4.3 Principles

- Mobile-first: all layouts designed for 375px wide first, then scaled up
- Touch targets minimum 44px
- Finnish and English language support (i18n via `next-intl`)

---

## 5. Data Models

### 5.1 Competition

```prisma
model Competition {
  id                   String            @id @default(cuid())
  sourceId             String?           @unique  // judokisa.fi ID for dedup
  name                 String
  slug                 String            @unique
  type                 CompetitionType
  status               CompetitionStatus
  dateStart            DateTime
  dateEnd              DateTime
  registrationDeadline DateTime?
  city                 String
  venue                String?
  country              String            @default("FI")
  description          String?
  categories           String[]          // e.g. ["U18", "U21", "Senior"]
  weightCategories     String[]          // e.g. ["-60kg", "-66kg", "-73kg"]
  capacity             Int?
  registeredCount      Int               @default(0)
  registrationUrl      String?           // external link
  results              Result[]
  matches              Match[]
  competitors          Competitor[]
  videoFeeds           VideoFeed[]
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
}

enum CompetitionType {
  TOURNAMENT
  CHAMPIONSHIP
  KATA
  CAMP
  OPEN
  INTERNATIONAL
}

enum CompetitionStatus {
  UPCOMING
  ONGOING
  COMPLETED
  CANCELLED
}
```

### 5.2 Result

```prisma
model Result {
  id              String      @id @default(cuid())
  competition     Competition @relation(fields: [competitionId], references: [id])
  competitionId   String
  athleteName     String
  club            String?
  weightCategory  String
  ageCategory     String?
  gender          Gender
  placement       Int         // 1, 2, 3, 5, 7...
  createdAt       DateTime    @default(now())
}

enum Gender {
  MALE
  FEMALE
}
```

### 5.3 Match

```prisma
model Match {
  id              String      @id @default(cuid())
  competition     Competition @relation(fields: [competitionId], references: [id])
  competitionId   String
  athlete1Name    String
  athlete2Name    String
  athlete1Club    String?
  athlete2Club    String?
  athlete1Score   Int?
  athlete2Score   Int?
  winnerName      String?
  weightCategory  String
  ageCategory     String?
  gender          Gender
  round           MatchRound?
  createdAt       DateTime    @default(now())
}

enum MatchRound {
  POOL
  ROUND_OF_32
  ROUND_OF_16
  QUARTER_FINAL
  SEMI_FINAL
  BRONZE
  FINAL
}
```

### 5.4 Competitor

Stores registered athletes scraped from `/continfo/showcontest2/{id}/` on judokisa.fi. Populated for all competition statuses (upcoming, ongoing, completed).

```prisma
model Competitor {
  id             String      @id @default(cuid())
  competition    Competition @relation(fields: [competitionId], references: [id])
  competitionId  String
  name           String
  country        String?     // ISO 3166-1 alpha-3, e.g. "FIN"
  club           String?
  beltRank       String?     // e.g. "4.kyu", "1.dan"
  gender         Gender
  birthYear      Int?
  weightCategory String      // normalised, e.g. "-46kg", "+100kg"
  ageCategory    String?     // e.g. "U15"
  createdAt      DateTime    @default(now())
}
```

### 5.5 VideoFeed

Stores one row per camera/tatami stream. Scraped from the `tatamis` JavaScript array at `/continfo/video/{id}/`. Replaces the former single `videoUrl` string on `Competition`.

```prisma
model VideoFeed {
  id            String      @id @default(cuid())
  competition   Competition @relation(fields: [competitionId], references: [id])
  competitionId String
  name          String      // "Tatami 1", "Tatami 2" …
  url           String
}
```

---

## 6. Pages & Routes

### 6.1 Route Map

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, next competitions, latest results |
| `/competitions` | Competition list | Upcoming + past, filterable |
| `/competitions/[slug]` | Competition detail — Information | Categories, weight classes, description |
| `/competitions/[slug]/athletes` | Competition detail — Athletes | Sortable competitor table |
| `/competitions/[slug]/matches` | Competition detail — Matches | Match table |
| `/competitions/[slug]/results` | Competition detail — Results | Results by weight/age category |
| `/competitions/[slug]/livestreams` | Competition detail — Livestreams | Per-tatami video feeds |
| `/api/competitions/[slug]/tabs` | Tab data API | JSON endpoint — all tab data for a competition |
| `/history` | Competitor history | Search by athlete name |

### 6.2 Home (`/`)

**Sections:**
1. **Hero** — full-bleed banner with `hero.avif` background image, site title, tagline, CTAs
2. **Upcoming competitions** — next 5 competitions as cards (name, date, city, type badge, registration deadline if open)
3. **Latest results** — 5 most recently completed competitions with top-3 podium per weight category

### 6.3 Competition List (`/competitions`)

**Features:**
- Tab switcher: **Upcoming** / **Past**
- Filters: search by name or city, competition type selector
- Competition cards: name, type badge, status badge, date range, city, capacity bar, registration deadline
- Pagination (20 per page)

### 6.4 Competition Detail (`/competitions/[slug]`)

All sub-pages share a **common layout** with:
- Back link to competition list
- Competition header: name, type/status badges, date, city/venue
- Details strip: date, location, registration deadline, capacity bar
- Register CTA button (links to external `registrationUrl`) when UPCOMING and not full
- **Sub-navigation tab bar** (pill-style, horizontally scrollable on mobile, emoji icons per tab)

Tab data is fetched once via `/api/competitions/[slug]/tabs` on layout mount, stored in a module-level client cache, and shared across all tabs. Switching tabs is instant (no re-fetch). Background revalidation runs every 60 seconds; tabs only re-render if the response payload changed.

#### Tab: Information (`/competitions/[slug]`)
- Age/division categories as pill tags
- Weight categories as pill tags
- Description / additional information (free text from organiser)

#### Tab: Athletes (`/competitions/[slug]/athletes`)
- **Sortable table**: columns Name · Club · Category · Country · Belt · Born
- Clicking a column header sorts ascending; clicking again reverses
- Country column: ISO alpha-3 code with flag emoji (rendered client-side, not stored)
- Belt column: coloured circle emoji matching kyu/dan grade (rendered client-side, not stored)
- For completed competitions with no `Competitor` rows: falls back to athletes derived from `Result` data (name + club + category only)
- For upcoming/ongoing with no competitor data: shows `registeredCount` stat + placeholder

#### Tab: Matches (`/competitions/[slug]/matches`)
- Table: category, round, athlete 1 vs athlete 2, score
- Winner name bolded
- Empty state when no match data

#### Tab: Results (`/competitions/[slug]/results`)
- Responsive card grid, one card per weight/age category
- Each card: category heading + placement table (placement, athlete name, club)
- 1st/2nd/3rd highlighted in gold/silver/bronze
- Empty state before competition is completed

#### Tab: Livestreams (`/competitions/[slug]/livestreams`)
- Responsive grid of tatami feed cards (1 col mobile, 2–3 col desktop)
- Each card: feed name ("Tatami 1") + embedded `<iframe>` for YouTube URLs
- Non-YouTube URL → styled link button instead of iframe
- Empty state when no feeds available

### 6.5 Competitor History (`/history`)

**Features:**
- Search input for athlete name (first + last)
- Optional second athlete name for head-to-head view
- **Single athlete**: competition history table (competition, date, city, category, placement)
- **Head-to-head**: all matches between the two athletes (competition, date, round, score, winner)

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Core Web Vitals target: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Competition detail layout and information tab statically generated (`generateStaticParams`)
- Tab content (athletes, matches, results, livestreams) rendered client-side from cached API response — instant tab switching after first load
- History search server-rendered on demand

### 7.2 Client-Side Caching (Competition Tabs)

- All tab data fetched in a single request to `/api/competitions/[slug]/tabs` when the competition layout mounts
- Cache stored in a module-level `Map` — survives component remounts within the same browser session
- Stale threshold: 60 seconds
- Background refresh: refetch every 60 seconds while the page is open
- Change detection: raw JSON string comparison — tab re-renders only if payload differs from previous fetch
- Switching between tabs uses cached data synchronously (no loading flash after initial fetch)

### 7.3 Responsive / Mobile
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px (Tailwind defaults)
- All tables scroll horizontally on mobile
- Sub-navigation tab bar scrolls horizontally on mobile (all tabs always reachable)
- Global nav: hamburger menu on mobile, full nav on `md+`

### 7.4 Internationalisation
- Default language: Finnish (`fi`)
- Secondary language: English (`en`)
- Implementation: `next-intl` with route-based locale prefix (`/fi/`, `/en/`)
- All UI strings in translation files; data (athlete names, city names) stored as-is

### 7.5 SEO
- Competition pages have structured metadata (title, description, OG tags)
- `sitemap.xml` generated from all competition slugs
- `robots.txt` allowing full indexing

### 7.6 Accessibility
- WCAG 2.1 AA target
- All interactive elements keyboard navigable
- Sufficient colour contrast on primary/white combinations

---

## 8. Future Considerations (not in v1)

- **Authentication** — NextAuth.js with email + social login
- **Registration flow** — athletes register for competitions within the platform
- **CMS** — replaces scraper; organizers manage competitions via an admin UI
- **Competitor profiles** — personal stats, history, club affiliation
- **Rankings** — national rankings by age/weight category
- **Push notifications** — draw published, results available
- **Mobile app** — React Native sharing business logic with Next.js

---

## 9. Repository Structure

```
/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── competitions/[slug]/tabs/route.ts  # Tab data API endpoint
│   │   └── [locale]/
│   │       ├── page.tsx                        # Home
│   │       ├── competitions/
│   │       │   ├── page.tsx                    # Competition list
│   │       │   ├── CompetitionFilters.tsx
│   │       │   └── [slug]/
│   │       │       ├── layout.tsx              # Shared header + sub-nav + cache provider
│   │       │       ├── page.tsx                # Information tab (server component)
│   │       │       ├── athletes/page.tsx       # Client component — reads from cache
│   │       │       ├── matches/page.tsx        # Client component — reads from cache
│   │       │       ├── results/page.tsx        # Client component — reads from cache
│   │       │       └── livestreams/page.tsx    # Client component — reads from cache
│   │       └── history/
│   │           ├── page.tsx
│   │           └── HistorySearch.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── CompetitionCard.tsx
│   │   ├── CompetitionSubNav.tsx               # Tab bar (client component)
│   │   ├── CompetitionTabsProvider.tsx         # Cache context + background refresh
│   │   ├── CompetitorTable.tsx                 # Sortable competitor table (client component)
│   │   ├── Badge.tsx
│   │   ├── CapacityBar.tsx
│   │   ├── ResultsTable.tsx
│   │   └── SearchInput.tsx
│   ├── lib/
│   │   ├── db.ts                               # Prisma singleton (pg adapter)
│   │   └── competitionTabCache.ts              # Module-level cache + fetch logic
│   ├── i18n/
│   │   ├── routing.ts
│   │   └── request.ts
│   └── messages/
│       ├── fi.json
│       └── en.json
├── prisma/
│   └── schema.prisma                           # Shared schema (frontend + scraper)
├── scraper/                                    # Standalone Node.js scraper
│   ├── src/
│   │   ├── index.ts
│   │   ├── scrapers/{list,detail}.ts
│   │   └── utils/{parse,slug}.ts
│   └── prisma.config.ts                        # References ../prisma/schema.prisma
└── spec.md
```
