# Judo Competition Platform — Application Specification

**Version:** 0.1.0
**Status:** Draft
**Last updated:** 2026-04-18

---

## 1. Overview

A mobile-first, responsive web platform for browsing Finnish judo competitions, viewing results, and accessing video feeds. This is a public read-only frontend that replaces [judokisa.fi](https://judokisa.fi). Data is populated by a separate scraper application and later by a dedicated CMS.

### 1.1 Goals

- Replace judokisa.fi with a fully responsive, mobile-first experience
- Provide fast access to competition listings, results, and video feeds without requiring login
- Establish a clean data layer (PostgreSQL) that can be written to by a scraper today and a CMS tomorrow
- Design the system so authentication, registration, and competitor stats can be layered in later without architectural changes

### 1.2 Out of scope (v1)

- User authentication and accounts
- Competition registration
- Competitor profiles and statistics
- Club directory
- Rankings
- Admin / CMS interface
- Scraper implementation (separate repository)

---

## 2. System Architecture

```
┌─────────────────┐        ┌──────────────────────────┐
│   Scraper app   │──────▶ │   PostgreSQL (Supabase)   │
│  (separate repo)│  write │                           │
└─────────────────┘        └──────────────────────────┘
                                        │ read (Prisma)
                            ┌───────────▼──────────────┐
                            │   Next.js Frontend        │
                            │   (this repository)       │
                            └──────────────────────────┘
```

- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **ORM**: Prisma (shared schema, used by both frontend and scraper)
- **Database**: PostgreSQL hosted on Supabase
- **Scraper**: Separate Node.js app, out of scope for this repository
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
  id                  String    @id @default(cuid())
  sourceId            String?   @unique  // judokisa.fi ID for dedup
  name                String
  slug                String    @unique
  type                CompetitionType
  status              CompetitionStatus
  dateStart           DateTime
  dateEnd             DateTime
  registrationDeadline DateTime?
  city                String
  venue               String?
  country             String    @default("FI")
  description         String?
  categories          String[]  // e.g. ["U18", "U21", "Senior"]
  weightCategories    String[]  // e.g. ["-60kg", "-66kg", "-73kg"]
  capacity            Int?
  registeredCount     Int       @default(0)
  videoUrl            String?
  registrationUrl     String?   // external link
  results             Result[]
  matches             Match[]
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
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

---

## 6. Pages & Routes

### 6.1 Route Map

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, next competitions, latest results |
| `/competitions` | Competition list | Upcoming + past, filterable |
| `/competitions/[slug]` | Competition detail | Info, results, video |
| `/history` | Competitor history | Search by athlete name |

### 6.2 Home (`/`)

**Sections:**
1. **Hero** — full-bleed banner with site title, tagline, and a CTA to browse competitions
2. **Upcoming competitions** — next 5 competitions as cards (name, date, city, type badge, registration deadline if open)
3. **Latest results** — 5 most recently completed competitions with top-3 podium per weight category
4. **Quick search** — search bar that links to `/history?q=`

### 6.3 Competition List (`/competitions`)

**Features:**
- Tab switcher: **Upcoming** / **Past**
- Filters (collapsible on mobile):
  - Search by name or city
  - Competition type (Tournament, Championship, Kata, etc.)
  - Age/weight category
  - Date range (past only)
- Sort: by date (default), by name, by city
- Competition cards showing:
  - Name, type badge, status badge
  - Date range and city
  - Capacity bar (registered / max) when available
  - Registration deadline (with urgency colour when <7 days)
  - "Full" or "Closed" overlay when applicable
- Pagination (20 per page) or infinite scroll

### 6.4 Competition Detail (`/competitions/[slug]`)

**Sections:**
1. **Header** — name, type, status badge, date, city/venue, organiser
2. **Info panel** — registration deadline, capacity, external registration link button, categories
3. **Video** — embedded YouTube player or link if `videoUrl` is set
4. **Results** — only shown when status is `COMPLETED`
   - Tab per weight/age category group
   - Podium (1st, 2nd, 3rd) highlighted
   - Full results table: placement, athlete name, club
5. **Matches** (optional, if data available) — bracket or table view of matches

### 6.5 Competitor History (`/history`)

**Features:**
- Search input for athlete name (first + last)
- Optionally enter a second athlete name to see head-to-head
- **Single athlete view:**
  - Competition history table: competition name, date, city, weight category, placement
  - Sortable columns, paginated (15 per page)
- **Head-to-head view:**
  - All matches between the two athletes: competition, date, scores, winner
  - Summary: win/loss record

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Core Web Vitals target: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Competition list and detail pages statically generated (ISR, revalidate every 10 minutes)
- History search via server-side API route (dynamic)

### 7.2 Responsive / Mobile
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px (Tailwind defaults)
- All tables scroll horizontally on mobile with sticky first column
- Navigation: hamburger menu on mobile, full nav on `md+`

### 7.3 Internationalisation
- Default language: Finnish (`fi`)
- Secondary language: English (`en`)
- Implementation: `next-intl` with route-based locale prefix (`/fi/`, `/en/`)
- All UI strings in translation files; data (athlete names, city names) stored as-is

### 7.4 SEO
- Competition pages have structured metadata (title, description, OG tags)
- `sitemap.xml` generated from all competition slugs
- `robots.txt` allowing full indexing

### 7.5 Accessibility
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

## 9. Repository Structure (planned)

```
/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── [locale]/
│   │   │   ├── page.tsx              # Home
│   │   │   ├── competitions/
│   │   │   │   ├── page.tsx          # Competition list
│   │   │   │   └── [slug]/page.tsx   # Competition detail
│   │   │   └── history/
│   │   │       └── page.tsx          # Competitor history
│   ├── components/           # Shared UI components
│   ├── lib/                  # DB client, utilities
│   └── messages/             # i18n translation files (fi.json, en.json)
├── prisma/
│   └── schema.prisma         # Shared data schema
└── spec.md                   # This file
```
