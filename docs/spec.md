# Judo Competition Platform — Application Specification

**Version:** 0.5.0 (decisions resolved — target spec)
**Status:** Draft — implementation-ready
**Last updated:** 2026-05-10

> **How to read this document.** This is the **target specification** for the merged judo competition platform. It supersedes the previous draft of `spec.md` (which described only the v1 read-only frontend) and the legacy `docs/specifications.md`. The 23 conflicts identified during the merge have been resolved; resolutions are recorded in the **Decision Log** (§12) for traceability. The current Prisma schema (`prisma/schema.prisma`) is a subset of the target schema; we will drop and recreate the database when migrating to this target.

---

## 1. Overview

A mobile-first, responsive web platform for managing the full lifecycle of Finnish judo competitions — from creating a competition and recruiting referees, through competitor registration, to publishing live results and post-event statistics. Replaces both the public read-only judokisa.fi browser **and** the operational/admin functions of the legacy judokisa.fi system.

**Audience:** Public visitors (browse, watch, register competitors), referees, club registrants, competition managers, coordinators, the Federation Commission, course instructors, and administrators.

> **Deprecation notice — scraper.** The `scraper/` subdirectory is **deprecated** and will be removed once the admin/CMS write path (§8.11), the JudoShiai SFTP ingest (§8.7), and registration flows (§8.2–8.4) cover all data the scraper currently produces. Until then it remains the interim write path; no new scraper features are planned. Tests, scraping selectors, and dedupe logic in `scraper/` should be considered frozen — bug-fixes only.

### 1.1 Goals

- Replace judokisa.fi with a fully responsive, mobile-first experience
- Provide fast public access to competition listings, results, and video feeds without requiring login
- Provide authenticated workflows for referee management, competitor registration, SuomiSport sync, and JudoShiai ingest
- Establish a clean PostgreSQL data layer used by frontend (read), scraper (write — interim), and the future admin UI (write — long-term)

### 1.2 Out of scope

- Push notifications
- Native mobile apps
- Public competitor profiles / personal stats pages (planned post-launch)
- A user-facing "documents per competition" CMS — see Decision Log D18

---

## 2. System Architecture

```
                 ┌──────────────────────┐
                 │  scraper/  DEPRECATED │  (interim write path — to be removed)
                 │  (Node.js)            │
                 └──────────────────────┘
                          │ write
                          ▼
┌──────────────────┐  ┌──────────────────────────┐  ┌──────────────────┐
│  Admin / CMS UI  │─▶│   PostgreSQL (Supabase)   │◀─│  Frontend (read) │
│  (planned)       │  │                           │  │  Next.js 16      │
└──────────────────┘  └──────────────────────────┘  └──────────────────┘
                          ▲                              │
                          │ ingest (JudoShiai files)     │
                          │                              ▼
                  ┌───────────────┐              ┌──────────────────┐
                  │ SFTP per-comp │              │ Object storage   │
                  │ chrooted accts│              │ (Supabase or S3) │
                  └───────────────┘              └──────────────────┘
                          ▲
                          │ OAuth2 (read-only sync)
                  ┌───────────────┐
                  │  SuomiSport   │
                  └───────────────┘
```

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **ORM**: Prisma v7 with `@prisma/adapter-pg` (shared schema)
- **Database**: PostgreSQL on Supabase
- **Identifiers**: cuid (`String @id @default(cuid())`) for all primary keys; `DateTime` for all timestamps
- **Object storage**: Supabase Storage **or** S3 (final choice deferred — see D23) — used for profile photos, future registration attachments, optional video HTML overrides
- **SFTP ingest**: per-competition chrooted Linux accounts (slug-based usernames) — see §8.7
- **SuomiSport client**: OAuth2 client credentials, background sync — see §8.6
- **Email**: SMTP outbound (referee invitations, account verification, password reset)
- **Social authentication**: Google, Facebook, GitHub, LinkedIn, Twitter
- **Hosting**: Vercel (frontend)

The frontend only ever reads from the database. Writes originate from:

- the **deprecated** `scraper/` (interim — bug-fixes only, slated for removal)
- the future admin / CMS UI (planned — §8.11)
- the JudoShiai SFTP ingest (planned — §8.7)
- the SuomiSport background sync (planned — §8.6)
- authenticated registration flows (planned — §8.2–8.4)

The scraper is retained only until the planned write paths above cover its responsibilities. Removing it is an explicit goal — see §13.

#### Scraper retirement criteria

The `scraper/` directory and its dependencies are removed once **all** of the following are true:

1. Admin / CMS UI can create and edit `Competition`, `CompetitionCategory`, and `VideoFeed` rows
2. JudoShiai SFTP ingest populates `Result`, `Match`, and `MatchHistory` for live and historical events
3. Authenticated registration flow populates `Competitor` (and `TeamEntry` for kata/team)
4. A one-off backfill job has imported any historical data still only available via the scraper
5. No production deploy has needed a scraper run for at least one full competition season

---

## 3. Users & Roles

A user may hold multiple roles simultaneously. All role flags default to `false` on `UserProfile` (§5.10).

| Role | Key Capabilities |
|---|---|
| **Administrator** | Full access: create / edit / delete competitions, manage all users, system configuration |
| **Commission** | Create international (KV-level) competitions, add referees, assign roles |
| **Coordinator** | Read reports, manage calendar entries, add referees to the system |
| **Competition Manager** | Recruit referees for competitions in their region, access active referee contact lists |
| **Competition Assistant** | Same capabilities as Competition Manager |
| **Competition Responsible** | See invited / confirmed referees and their contacts, edit competition logistics |
| **Course Instructor** | Manage referee training courses and participant lists |
| **Referee** | View own profile, register for competitions, accept / decline referee invitations |
| **JudoShiai Operator** | Upload live match results via SFTP |
| **Video Operator** | Manage video streaming links for a competition |
| **Registrant** | Register competitors for competitions, edit own profile |
| **Public (Visitor)** | Browse competitions, watch live results, register competitors (anonymous) |

---

## 4. Design System

### 4.1 Color Palette

| Token | Value | Usage |
|---|---|---|
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

- **Font**: Inter (Google Fonts)
- **Scale**: Tailwind default
- **Headings**: `font-bold`, `text-primary`

### 4.3 Principles

- Mobile-first: layouts designed for 375px first, then scaled up
- Touch targets minimum 44px
- Finnish (default) and English (`next-intl` route prefix `/fi/`, `/en/`)
- Date formats follow Finnish convention (DD.MM.YYYY) for the Finnish locale

---

## 5. Data Models (target schema)

All models use cuid string PKs. All timestamps are `DateTime`. Prisma `@relation` boilerplate omitted in some snippets for readability — every relation defined here is a normal Prisma relation. The current `prisma/schema.prisma` is a strict subset of this target; the database will be dropped and recreated to migrate.

### 5.1 Competition

```prisma
model Competition {
  id                    String              @id @default(cuid())
  sourceId              String?             @unique  // judokisa.fi ID for scraper dedup
  slug                  String              @unique
  numericId             Int?                @unique  // not used for SFTP (slug-based) but kept for legacy ID compatibility

  // Identity & description
  name                  String
  description           String?
  city                  String
  venue                 String?
  address               String?
  country               String              @default("FI")
  geographicArea        GeographicArea?

  // Classification — keep both `type` (scrape-derived high-level) and `level` (federation classification)
  type                  CompetitionType
  level                 CompetitionLevel?

  // Lifecycle
  status                CompetitionStatus   @default(UPCOMING)  // derived from dates
  registrationOpen      Boolean             @default(false)     // explicit flag, set independently
  dateStart             DateTime
  dateEnd               DateTime
  registrationDeadline  DateTime?

  // Capacity
  capacity              Int?                                    // null = no limit
  registeredCount       Int                 @default(0)

  // Operational
  numberOfTatamiMats    Int                 @default(3)
  targetRefereeCount    Int                 @default(0)
  matchDurationMinutes  Int                 @default(7)
  useCustomVideoHtml    Boolean             @default(false)
  extraFieldsConfig     Json?                                   // see §11.4
  registrationUrl       String?                                 // external link (interim, scraped)
  infoUrl               String?
  resultsUrl            String?
  previousYearReference String?                                 // FK semantics → Competition.id of prior year's event

  // Staff assignments (all optional)
  responsibleUserId       String?
  competitionManagerId    String?
  competitionAssistantId  String?
  judoShiaiOperatorId     String?
  videoOperatorId         String?

  // Relations
  categories            CompetitionCategory[]
  competitors           Competitor[]
  results               Result[]
  matches               Match[]
  videoFeeds            VideoFeed[]
  refereeInvitations    CompetitionRefereeInvitation[]
  teamEntries           TeamEntry[]

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@index([status, dateStart])
  @@index([slug])
  @@index([level])
}

enum CompetitionType {
  TOURNAMENT
  CHAMPIONSHIP
  KATA
  CAMP
  OPEN
  INTERNATIONAL
}

enum CompetitionLevel {
  SM            // Finnish Senior Masters
  NSM           // Finnish Non-Senior Masters
  SC            // Swedish Competition (Nordic cross-border)
  FJO           // Finnish Youth Organization events
  KV            // International (Commission-only to create)
  STARTTI_CUP   // Beginner-level series
  KATA          // Forms / kata
  TEAM          // Team event
  MUU           // Other / unclassified
}

enum CompetitionStatus {
  UPCOMING
  ONGOING
  COMPLETED
  CANCELLED
}

enum GeographicArea {
  LOU   // Southwest (Lounais)
  LAN   // West (Länsi)
  POH   // North (Pohjois)
  ITA   // East (Itä)
  KAA   // Southeast (Kaakkois)
  ETE   // South (Etelä)
}
```

### 5.2 CompetitionCategory

Replaces the previous flat `categories String[]` / `weightCategories String[]` arrays (D4). Each competition owns a set of categories with full bilingual labels and structured weight classes.

```prisma
model CompetitionCategory {
  id            String         @id @default(cuid())
  competition   Competition    @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  competitionId String
  code          String         // e.g. "M", "P18", "T15"
  nameEn        String
  nameFi        String
  minAge        Int            // 0 = no minimum
  maxAge        Int            // 0 = no maximum
  gender        CategoryGender
  weightClasses Int[]          // ordered; negative = "under X" (e.g. -66), positive = "over X" (e.g. 100 = +100)
  competitors   Competitor[]

  @@unique([competitionId, code])
  @@index([competitionId])
}

enum CategoryGender { MEN WOMEN BOTH }
```

The default category set (M, M21, P18, P15, P13, P11, N, N21, T18, T15, T13, T11) and their standard weight classes are seeded when a competition is created. Default values are listed in `docs/requirements.md §3`.

### 5.3 Competitor

Names are split (D8 / D16 / D22). Phone/email/yearOfBirth/categoryId are required in the in-platform registration form but kept optional at the DB level so the interim scraper can populate rows without them. The application layer enforces "required for in-platform registration" via validation.

```prisma
model Competitor {
  id               String                @id @default(cuid())
  competition      Competition           @relation(fields: [competitionId], references: [id])
  competitionId    String

  // Identity (split names)
  firstName        String
  lastName         String

  // Contact (required for in-platform registration; optional at DB layer for scraped data)
  phone            String?
  email            String?

  // Demographics
  yearOfBirth      Int?
  gender           Gender                @default(UNKNOWN)
  country          String                @default("FIN")     // IOC alpha-3

  // Affiliation — both representations: FK when matched, free-text fallback when not
  clubId           String?
  club             Club?                 @relation(fields: [clubId], references: [id])
  clubName         String?               // free-text — used when clubId cannot be resolved

  // Category
  categoryId       String?
  category         CompetitionCategory?  @relation(fields: [categoryId], references: [id])
  weightClass      Int?                  // negative = "under X", positive = "over X" — denormalised for fast queries

  // Grade
  judoGrade        JudoGrade?

  // Registration metadata
  registeredById   String?               // FK → User
  registeredBy     User?                 @relation("CompetitorRegisteredBy", fields: [registeredById], references: [id])
  licenseValid     Boolean?              // null = not yet checked
  ageEligible      Boolean?              // null = not yet checked
  removed          Boolean               @default(false)
  extraFieldValues Json?                 // keys match Competition.extraFieldsConfig

  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  @@index([competitionId])
  @@index([lastName, firstName])
  @@index([clubId])
}

enum Gender { MALE FEMALE UNKNOWN }

enum JudoGrade {
  K6  K5  K4  K3  K2  K1
  D1  D2  D3  D4  D5  D6  D7  D8  D9  D10
}
```

### 5.4 Club

```prisma
model Club {
  id             String       @id @default(cuid())
  displayName    String       @unique
  country        String       @default("FIN")
  suomiSportName String?                   // null if no SuomiSport mapping
  competitors    Competitor[]
  results        Result[]
}
```

140 Finnish clubs are pre-seeded — see `docs/appendix-clubs.md`. 21 of those have no SuomiSport mapping.

### 5.5 Result

Final standings, typically populated from JudoShiai `results.json` (§11.1) but also writable via admin UI.

```prisma
model Result {
  id            String       @id @default(cuid())
  competition   Competition  @relation(fields: [competitionId], references: [id])
  competitionId String
  firstName     String
  lastName      String
  clubId        String?
  club          Club?        @relation(fields: [clubId], references: [id])
  clubName      String?      // free-text fallback when clubId not resolved
  country       String       @default("FIN")
  category      CompetitionCategory? @relation(fields: [categoryId], references: [id])
  categoryId    String?
  weightClass   Int?         // -66 = "under 66 kg", +100 = "over 100 kg"
  ageCategory   String?      // category code (e.g. "T15") — also derivable via category.code
  gender        Gender
  placement     Int          // 1, 2, 3, 5, 7… (ties share a number)
  createdAt     DateTime     @default(now())

  @@index([competitionId])
  @@index([lastName, firstName])
}
```

### 5.6 Match (per-tournament bracket data)

Per-competition match log. `MatchRound` is **dropped** (D13) — JudoShiai does not expose round info, and round was speculative.

```prisma
model Match {
  id              String       @id @default(cuid())
  competition     Competition  @relation(fields: [competitionId], references: [id])
  competitionId   String
  athlete1First   String
  athlete1Last    String
  athlete2First   String
  athlete2Last    String
  athlete1Club    String?
  athlete2Club    String?
  athlete1Score   Int?
  athlete2Score   Int?
  winnerSide      Int?         // 1 or 2 (denormalised for display)
  category        CompetitionCategory? @relation(fields: [categoryId], references: [id])
  categoryId      String?
  weightClass     Int?
  gender          Gender
  createdAt       DateTime     @default(now())

  @@index([competitionId])
  @@index([athlete1Last, athlete1First])
  @@index([athlete2Last, athlete2First])
}
```

### 5.7 MatchHistory (regeneratable)

Aggregated cross-competition match log used by StarttiCup eligibility checks (§10.3) and Samurai Cup point calculation (§8.5). Fully regeneratable from stored JudoShiai files — not in the critical backup set.

```prisma
model MatchHistory {
  id              String   @id @default(cuid())
  search1         String   // normalised "firstname_lastname" lowercase
  search2         String
  points1         Int      // > 0 = win
  points2         Int
  competitionName String
  date            DateTime
  category        String   // combined code, e.g. "T15-44"
  externalId1     String?  // JudoShiai competitor id
  externalId2     String?

  @@index([search1])
  @@index([search2])
  @@index([date])
  @@index([competitionName])
}
```

### 5.8 TeamEntry (kata pairs and team events)

A `TeamEntry` represents a registration unit composed of multiple competitors — used for Kata (pair) and Team competitions. For individual competitions, `TeamEntry` is not used; competitors are registered directly.

```prisma
model TeamEntry {
  id            String           @id @default(cuid())
  competition   Competition      @relation(fields: [competitionId], references: [id])
  competitionId String
  type          TeamEntryType
  name          String?          // team name (Team) or pair label (Kata, optional)
  clubId        String?
  club          Club?            @relation(fields: [clubId], references: [id])
  clubName      String?          // free-text fallback
  categoryId    String?
  category      CompetitionCategory? @relation(fields: [categoryId], references: [id])
  judoGrade     JudoGrade?       // pair grade for Kata
  members       TeamEntryMember[]
  registeredById String?
  registeredBy   User?           @relation("TeamRegisteredBy", fields: [registeredById], references: [id])
  removed       Boolean          @default(false)
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([competitionId])
}

model TeamEntryMember {
  id          String     @id @default(cuid())
  teamEntry   TeamEntry  @relation(fields: [teamEntryId], references: [id], onDelete: Cascade)
  teamEntryId String
  competitor  Competitor @relation(fields: [competitorId], references: [id])
  competitorId String
  role        TeamMemberRole?  // optional — e.g. TORI / UKE for Kata
  position    Int?             // ordering within the team

  @@index([teamEntryId])
  @@index([competitorId])
}

enum TeamEntryType { KATA TEAM }
enum TeamMemberRole { TORI UKE }
```

Each `TeamEntryMember` references a `Competitor` row (which is created or reused at registration time), so the Athletes view continues to list everyone uniformly.

### 5.9 VideoFeed

```prisma
model VideoFeed {
  id            String       @id @default(cuid())
  competition   Competition  @relation(fields: [competitionId], references: [id])
  competitionId String
  name          String                          // free-text label, e.g. "Tatami 1"
  tatamiNumber  Int?                            // 1–4 when normalised; null otherwise
  url           String

  @@index([competitionId])
}
```

### 5.10 User & UserProfile

```prisma
model User {
  id        String        @id @default(cuid())
  email     String        @unique
  password  String?                              // hash; null if social-auth only
  firstName String
  lastName  String
  profile   UserProfile?
  registeredCompetitors        Competitor[]   @relation("CompetitorRegisteredBy")
  registeredTeams              TeamEntry[]    @relation("TeamRegisteredBy")
  refereeInvitations           CompetitionRefereeInvitation[]
  instructedCourses            CourseInstructor[]
  attendedCourses              CourseParticipant[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}

model UserProfile {
  id                       String                @id @default(cuid())
  user                     User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId                   String                @unique

  // Roles (all default false; many users hold multiple)
  isReferee                Boolean               @default(false)
  isAdministrator          Boolean               @default(false)
  isCommission             Boolean               @default(false)
  isCoordinator            Boolean               @default(false)
  isCompetitionManager     Boolean               @default(false)
  isCompetitionAssistant   Boolean               @default(false)
  isCompetitionResponsible Boolean               @default(false)
  isCourseInstructor       Boolean               @default(false)
  isJudoShiaiOperator      Boolean               @default(false)
  isVideoOperator          Boolean               @default(false)

  // Personal
  phone                    String?
  dateOfBirth              DateTime?
  address                  String?
  club                     String?               // free-text — referees may belong to non-listed clubs
  geographicArea           GeographicArea?
  judoGrade                JudoGrade?
  refereeLicenseLevel      RefereeLicenseLevel?
  profilePhoto             String?               // object-storage URL or key

  // SuomiSport
  suomiSportInternalId     Int?
  suomiSportPersonId       Int?
  gdprNoSync               Boolean               @default(false)

  // Status
  active                   Boolean               @default(true)
  blacklisted              Boolean               @default(false)

  // Registration form prefill
  defaultCategoryCode      String?
  defaultWeightClass       Int?                  // negative = "under X", positive = "over X"
}

enum RefereeLicenseLevel { D C B A INT_B INT_A }
```

### 5.11 CompetitionRefereeInvitation

```prisma
model CompetitionRefereeInvitation {
  competition   Competition         @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  competitionId String
  referee       User                @relation(fields: [refereeId], references: [id])
  refereeId     String
  status        RefereeInviteStatus
  invitedAt     DateTime            @default(now())
  respondedAt   DateTime?

  @@id([competitionId, refereeId])
  @@index([refereeId])
}

enum RefereeInviteStatus { ASKED DECLINED PROMISED AGREED PRESENT }
```

State transitions: `ASKED → {DECLINED | PROMISED | AGREED}`, `AGREED → PRESENT` (recorded after the event).

### 5.12 Courses

```prisma
model Course {
  id                 String              @id @default(cuid())
  name               String
  location           String
  startDate          DateTime
  endDate            DateTime
  level              CourseLevel?
  suomiSportCourseId Int?
  instructors        CourseInstructor[]
  participants       CourseParticipant[]
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
}

enum CourseLevel { UP MA OT SE }   // Update / Main Training / Other / Seminar

model CourseInstructor {
  course       Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  courseId     String
  instructor   User   @relation(fields: [instructorId], references: [id])
  instructorId String
  @@id([courseId, instructorId])
}

model CourseParticipant {
  course        Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  courseId      String
  participant   User   @relation(fields: [participantId], references: [id])
  participantId String
  @@id([courseId, participantId])
}
```

### 5.13 SuomiSport caches

Local read-only caches populated by the SuomiSport background sync (§8.6). Never written to by users.

```prisma
model SuomiSportLicence {
  id                   String  @id @default(cuid())
  suomiSportPersonId   Int
  suomiSportInternalId Int     @unique
  firstName            String
  lastName             String
  club                 String
  licenseStartDate     String  // as returned by SuomiSport
  licenseEndDate       String
  email                String
  address              String?
  phone                String?
  dateOfBirth          String?
  genderFlags          Int     // bitmask: bit0=male, bit1=female, bit2=guardianPhone, bit3=guardianEmail

  @@index([lastName, firstName])
  @@index([club])
}

model SuomiSportMerit {
  id                   String  @id @default(cuid())
  suomiSportInternalId Int     @unique
  meritGroupId         Int
  name                 String
  meritGroupName       String
  description          String?
}

model SuomiSportGrantedMerit {
  id                   String  @id @default(cuid())
  meritNumber          Int
  suomiSportInternalId Int     // references SuomiSportLicence.suomiSportInternalId
  meritId              Int     // references SuomiSportMerit.suomiSportInternalId
  meritGroupId         Int
  grantedDate          String
  meritName            String
  meritGroupName       String

  @@index([suomiSportInternalId])
}
```

---

## 6. Pages & Routes

### 6.1 Public routes

| Route | Page | Description |
|---|---|---|
| `/` | Home | Hero, next competitions, latest results |
| `/competitions` | Competition list | Upcoming + past, filterable, paginated (20/page) |
| `/competitions/[slug]` | Competition detail — Information | Categories, weight classes, description |
| `/competitions/[slug]/athletes` | Competition detail — Athletes | Sortable competitor table |
| `/competitions/[slug]/matches` | Competition detail — Matches | Match table |
| `/competitions/[slug]/results` | Competition detail — Results | Results by weight/age category |
| `/competitions/[slug]/livestreams` | Competition detail — Livestreams | Per-tatami video feeds |
| `/competitions/[slug]/results.txt` | Press results | `text/plain`, no login |
| `/competitions/[slug]/register` | Registration | Individual / kata-pair / team forms based on competition level |
| `/api/competitions/[slug]/tabs` | Tab data API | JSON; client-side cache source |
| `/history` | Competitor history / head-to-head | |
| `/athletes` | Athletes index | Aggregate athlete view |
| `/rankings/samurai-cup/[year]` | Samurai Cup standings | Generated on demand |

### 6.2 Authenticated routes

| Route | Roles | Purpose |
|---|---|---|
| `/auth/login`, `/auth/register`, `/auth/reset-password`, `/auth/callback/[provider]` | Public | Auth flows |
| `/profile` | Any authenticated | Edit own profile, view referee history & courses |
| `/profile/invitations` | Referee | Pending referee invitations (accept / decline) |
| `/admin` | Admin / Manager / Coordinator (per page) | Dashboard hub |
| `/admin/competitions` | Admin / Commission / Manager | Competition management |
| `/admin/competitions/[id]/referees` | Manager / Assistant / Responsible | Invite referees, mark attendance |
| `/admin/competitions/[id]/competitors` | Manager / Assistant / Admin | Registrant list, analyze, close registration |
| `/admin/competitions/[id]/sftp` | Admin | View / regenerate SSH keys |
| `/admin/referees` | Manager / Coordinator / Admin | Referee directory, area filter, reports 1–3 |
| `/admin/users` | Admin | User CRUD, GDPR controls, blacklist |
| `/admin/clubs` | Admin | Club CRUD, SuomiSport name mapping |
| `/admin/courses` | Course Instructor / Admin | Course CRUD, participant lists |
| `/admin/suomisport/sync` | Admin | Trigger sync, view progress |

### 6.3 Home (`/`)

1. **Hero** — full-bleed banner with `hero.avif` background image, site title, tagline, CTAs
2. **Upcoming competitions** — next 5 competitions as cards (name, date, city, type badge, registration deadline if open)
3. **Latest results** — 5 most recently completed competitions with top-3 podium per weight category

### 6.4 Competition list (`/competitions`)

- Tab switcher: **Upcoming** / **Past**
- Filters: search by name or city, competition type selector
- Cards: name, type badge, status badge, date range, city, capacity bar, registration deadline
- Pagination (20 per page)

### 6.5 Competition detail (`/competitions/[slug]`)

Common layout for all sub-pages:

- Back link to competition list
- Header: name, type/status/level badges, date, city/venue
- Details strip: date, location, registration deadline, capacity bar
- **Register CTA** — links to `/competitions/[slug]/register` when `registrationOpen = true` and not full; falls back to external `registrationUrl` if registration is not yet built for this competition's level
- Sub-navigation tab bar (pill-style, horizontally scrollable on mobile, emoji icons)

Tab data fetched once via `/api/competitions/[slug]/tabs` on layout mount, stored in a module-level client cache, shared across tabs. Switching is instant after first load. Background revalidation every 60 s; tabs re-render only if the payload changed (raw JSON-string compare).

#### Tab: Information (`/competitions/[slug]`)
- Age/division categories as pill tags (FI/EN per active locale, sourced from `CompetitionCategory.nameFi` / `nameEn`)
- Weight categories as pill tags (rendered from `CompetitionCategory.weightClasses`)
- Free-text description / additional information

#### Tab: Athletes (`/competitions/[slug]/athletes`)
- Sortable table: Name · Club · Category · Country · Belt · Born
- Click column header to sort ascending; click again to reverse
- Country: ISO alpha-3 code with flag emoji (rendered client-side, not stored)
- Belt: coloured circle emoji matching kyu/dan grade
- For completed competitions with no `Competitor` rows: falls back to athletes derived from `Result` data
- For upcoming/ongoing with no competitor data: shows `registeredCount` stat + placeholder

#### Tab: Matches (`/competitions/[slug]/matches`)
- Table: category, athlete 1 vs athlete 2, score, winner highlighted
- Empty state when no match data

#### Tab: Results (`/competitions/[slug]/results`)
- Responsive card grid, one card per weight/age category
- Each card: category heading + placement table (placement, athlete name, club)
- 1st/2nd/3rd highlighted in gold/silver/bronze
- Empty state before competition is completed

#### Tab: Livestreams (`/competitions/[slug]/livestreams`)
- Responsive grid of tatami feed cards (1 col mobile, 2–3 col desktop)
- Each card: feed name + embedded `<iframe>` for YouTube URLs
- Non-YouTube URL → styled link button instead of iframe
- Empty state when no feeds available

### 6.6 Competitor history (`/history`)
- Search input for athlete name (first + last)
- Optional second athlete name for head-to-head view
- Single athlete: competition history table (competition, date, city, category, placement)
- Head-to-head: all matches between the two athletes (competition, date, score, winner)

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Core Web Vitals targets: LCP < 2.5 s, CLS < 0.1, INP < 200 ms
- Competition detail layout and Information tab statically generated (`generateStaticParams`)
- Tab content (athletes, matches, results, livestreams) rendered client-side from cached API response — instant tab switching after first load
- History search server-rendered on demand
- Public competition / results pages cacheable (high read volume, infrequent writes)
- SuomiSport background syncs must not block UI

### 7.2 Client-side caching (competition tabs)
- All tab data fetched in a single request to `/api/competitions/[slug]/tabs` at layout mount
- Cache stored in a module-level `Map`; survives component remounts within the same browser session
- Stale threshold: 60 s; background refresh every 60 s while page is open
- Change detection: raw JSON string compare — re-render only when payload differs
- Tab switches read from cache synchronously (no loading flash after first fetch)

### 7.3 Responsive / mobile
- Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px (Tailwind defaults)
- Tables scroll horizontally on mobile
- Sub-navigation tab bar scrolls horizontally on mobile (all tabs always reachable)
- Global nav: hamburger on mobile, full nav on `md+`

### 7.4 Internationalisation
- Default language: Finnish (`fi`)
- Secondary language: English (`en`)
- Implementation: `next-intl` with route-based locale prefix
- All UI strings in translation files; data values stored as-is
- Language switch persisted in user preferences (and cookies for visitors)

### 7.5 SEO
- Competition pages have structured metadata (title, description, OG tags)
- `sitemap.xml` generated from all competition slugs
- `robots.txt` allowing full indexing

### 7.6 Accessibility
- WCAG 2.1 AA target
- All interactive elements keyboard navigable
- Sufficient colour contrast on primary/white combinations

### 7.7 Data integrity
- Competitor records are never hard-deleted; `removed` flag is used for soft deletes
- Competition records are retained indefinitely as historical records
- `MatchHistory` is fully regeneratable from stored JudoShiai result files

### 7.8 Backup & recovery
- Automated nightly database backups; ≥ 14-day retention
- `MatchHistory` not in critical backup set (regeneratable)

### 7.9 Access control
- Sensitive pages enforce role checks; unauthorised access returns a clear message
- Public pages (competition list, competitor list, live results, press results) require no login
- Registration may be open to anonymous users or require login depending on competition config

### 7.10 Security
- Passwords hashed (bcrypt or argon2)
- SFTP accounts: SSH key auth only; chrooted to per-competition directory; no shell
- Object storage signed URLs for private assets

---

## 8. Functionality Roadmap (planned features)

These features are not yet implemented in the codebase. They are listed here in implementation-order intent (no fixed dates).

### 8.1 User accounts, roles, and authentication
- Email + password registration with email verification; password reset
- Social login: Google, Facebook, GitHub, LinkedIn, Twitter
- Self-edit profile (contact details, photo, area, grade)
- Admins create / edit / deactivate / view any user; assign roles (§3)
- GDPR controls: `gdprNoSync` flag (blocks SuomiSport sync), full user-data deletion
- Blacklist flag prevents specific individuals from using the system

### 8.2 Competitor registration (individual)
- Open registration window per competition (`registrationOpen` flag, deadline)
- Required (validated): firstName, lastName, yearOfBirth, gender, club (FK or free-text), country, weightClass, judoGrade, phone, email
- Validation flags shown but do not hard-block:
  - `licenseValid` — checked against `SuomiSportLicence` (§10.4)
  - `ageEligible` — checked against `CompetitionCategory.minAge` / `maxAge`
  - Name / birth-year mismatch vs SuomiSport — flagged separately
- Available categories filtered by `CategoryGender` and the competitor's gender
- Multiple competitors from the same club in one session
- Soft-delete via `removed` flag
- Admin "Analyze" function: scans registrations and flags reversed first/last names, birth-year mismatches, duplicates, license issues
- Registration can be manually closed by admins at any time
- StarttiCup eligibility check (§10.3) for Finnish competitors entering beginner-level events
- Per-competition extra fields rendered from `Competition.extraFieldsConfig` (§11.4)
- Registrant's `defaultCategoryCode` + `defaultWeightClass` pre-fill the form

### 8.3 Bulk registration (Excel)
- Download Excel template pre-configured for a competition's categories
- Upload completed Excel; row-by-row error reporting
- Download current competitor list as Excel
- Download "my club's previous competitors" template pre-filled with the registrant's historical entries

### 8.4 Kata and Team registration
- Both use `TeamEntry` (§5.8) with `type = KATA` or `type = TEAM`
- **Kata:** pair entry (two `TeamEntryMember` rows, optional TORI/UKE roles), category, pair grade
- **Team:** group entry, team name + club, category-specific
- Editable after initial registration

### 8.5 Press results endpoint
- Route `/competitions/[slug]/results.txt`, `Content-Type: text/plain`, no login
- Format: one category label per line, then `1. Last First, Club; 2. Last First, Club; …`
- Bilingual category labels (FI/EN per active locale): "Men under 66 kg" / "Miehet alle 66 kg"
- All placements shown (including ties); category order = order in source `results.json`
- Empty body if no results uploaded yet
- Format spec: §11.2

### 8.6 SuomiSport integration
- OAuth2 client-credentials flow
  - Token endpoint: `https://www.suomisport.fi/oauth2/token`
  - API base: `https://www.suomisport.fi/api/public/v2`
  - Credentials in env var `SUOMISPORT_TOKEN`
- Background sync job; manually triggerable from admin UI with real-time progress
- Populates `SuomiSportLicence`, `SuomiSportMerit`, `SuomiSportGrantedMerit` (§5.13)
- Users with `gdprNoSync = true` are skipped
- License validation during competitor registration (§10.4)

### 8.7 JudoShiai SFTP ingest
- Each competition gets up to two dedicated chrooted Linux accounts (slug-based usernames — D21):
  - Results operator: `r-{competition.slug}` (e.g. `r-helsinki-open-2026`)
  - Video operator:   `v-{competition.slug}`
- SSH key auth only; no passwords, no shell
- Ed25519 keypair generated per competition; private key downloadable by admins
- Provisioning / deprovisioning via server-side shell script
- Frontend ingests:
  - `results.json` — final standings (§11.1) → `Result` rows + press output + Samurai Cup input
  - Raw match records → `MatchHistory` (§5.7)
- Up to 4 video streams per competition (one per tatami); optional custom HTML override (`Competition.useCustomVideoHtml`)

### 8.8 Referee recruitment & management
- Competition manager invites referees (creates `CompetitionRefereeInvitation` with `ASKED`)
- Email invitation with response link — Accept / Decline without login (signed URL)
- Admins can also accept / decline on a referee's behalf (verbal confirmations)
- Status progression: `ASKED → {DECLINED, PROMISED, AGREED} → PRESENT`
- Post-competition: manager records attendance (`PRESENT`)
- Browse / filter referees by `geographicArea`
- Reports:
  - **Report 1:** Referees by area with contact details and competition history
  - **Report 2:** Individual referee career history (courses attended, competitions refereed)
  - **Report 3:** International referee competition list (`refereeLicenseLevel ∈ {INT_B, INT_A}`)

### 8.9 Training courses
- Course CRUD (name, location, dates, level, optional `suomiSportCourseId`)
- Many-to-many: course ↔ instructors (users), course ↔ participants (users)
- Course Instructor role manages course rosters
- Merit completion records (`SuomiSportGrantedMerit`) synced from SuomiSport

### 8.10 Samurai Cup rankings
- Per-year, per-weight-category rankings of competitors and clubs
- Points per competitor per competition:
  - 1 pt for participating
  - 1 pt per match won (from `MatchHistory`)
  - Placement bonus: 1st = 9, 2nd = 6, 3rd = 3
- Tiebreaker: total points → wins → 1sts → 2nds → 3rds → 4–5th → 6–7th → last name (alphabetical)
- Club standings = sum of all competitors' points per club
- Output: printable / shareable HTML at `/rankings/samurai-cup/[year]`
- Generated on demand for the selected year

### 8.11 Admin / CMS surfaces
Replaces the (deprecated — §2) scraper as the long-term write path. Routes listed in §6.2.

---

## 9. External Integrations

### 9.1 SuomiSport
- **What:** OAuth2-authenticated REST API
- **Why:** Authoritative source for referee licenses, competitor certifications, club master data
- **Direction:** SuomiSport → Judokisa (read-only)
- **Trigger:** Background job, manually triggered by admin or scheduled

### 9.2 JudoShiai
- **What:** Desktop competition-management software
- **Why:** Live and final results come from JudoShiai — not entered manually
- **Data:** Competitor list (JSON), match results (JSON), final standings (`results.json`)
- **Transport:** SFTP upload to per-competition chrooted directory (§8.7)
- **File formats:** §11.1

### 9.3 Email (outbound)
- **Why:** Referee invitations, account verification, password reset notifications
- **Delivery:** SMTP

### 9.4 Social authentication
- **Why:** Lower barrier for referees and club registrants
- **Providers:** Google, Facebook, GitHub, LinkedIn, Twitter

### 9.5 Object storage
- **What:** Supabase Storage **or** S3 (final choice deferred — D23)
- **Why:** Profile photos, future registration attachments, optional video HTML override page
- **Access:** Public for read where appropriate (e.g. profile photos); signed URLs for private content

---

## 10. Business Rules

### 10.1 Competition levels

| Code | Meaning |
|---|---|
| SM | Finnish Senior Masters (main national championships) |
| NSM | Finnish Non-Senior Masters |
| SC | Swedish Competition (Nordic cross-border) |
| FJO | Finnish Youth Organization events |
| KV | International — requires Commission role to create |
| STARTTI_CUP | Beginner-level competition series |
| KATA | Forms / kata competition — uses `TeamEntry` |
| TEAM | Team event competition — uses `TeamEntry` |
| MUU | Other / unclassified |

### 10.2 Referee invitation states

```
ASKED → DECLINED   (declined by referee)
ASKED → PROMISED   (indicated willingness)
ASKED → AGREED     (confirmed)
AGREED → PRESENT   (attended, recorded after event)
```

### 10.3 StarttiCup eligibility

A competitor is flagged ineligible for StarttiCup if their win count in **regular** competitions exceeds 5 (≥ 6 wins → flag).

```
wins = count of distinct rows in MatchHistory where:
    (competitor's search-key matches search1 AND points1 > 0)
  OR (competitor's search-key matches search2 AND points2 > 0)
  AND competitionName NOT LIKE 'Startti%'
  AND competitionName NOT LIKE 'Junnu%'
  AND competitionName NOT LIKE '%salikisa%'
```

- Search key: lowercase `firstname_lastname`
- Only applied to Finnish competitors (`country = "FIN"`); foreign competitors bypass
- Flag is a **warning** only — does not hard-block registration
- Surfaced during the admin Analyze step (§8.2)

### 10.4 License validation

- A competitor's license is valid if `SuomiSportLicence` has a record matching firstName + lastName + club where the competition's start date falls within `licenseStartDate`–`licenseEndDate`
- Name / birth-year mismatches are flagged **separately** from license validity
- Validity is a flag — never a hard block

### 10.5 Category eligibility

- Categories are defined per competition (`CompetitionCategory`)
- Each category specifies: code, EN/FI name, minAge, maxAge (0 = no max), gender (`MEN` / `WOMEN` / `BOTH`), ordered weight classes
- Age eligibility uses **year of birth vs competition year** (not exact birthdate)
- Weight class notation: `-66` = under 66 kg (≤ 66.0 kg), `+100` = over 100 kg

### 10.6 Geographic areas

| Code | Area |
|---|---|
| LOU | Southwest (Lounais-Suomi) |
| LAN | West (Länsi-Suomi) |
| POH | North (Pohjois-Suomi) |
| ITA | East (Itä-Suomi) |
| KAA | Southeast (Kaakkois-Suomi) |
| ETE | South (Etelä-Suomi) |

### 10.7 Naming conventions
- Person names are stored as separate `firstName` / `lastName` everywhere (Competitors, Results, Match athlete sides, Users, SuomiSport caches)
- Display order is locale-dependent; press output uses `"Last First"` (§11.2)
- Search keys use lowercase `firstname_lastname` with diacritics preserved

---

## 11. File Formats

### 11.1 JudoShiai `results.json` — final standings

Array of category objects. Used by the live results view, press results endpoint (§11.2), and Samurai Cup point calculations.

```json
[
  {
    "category": "T15-44",
    "numcomp": 7,
    "clubtext": 1,
    "nameord": 1,
    "competitors": [
      { "ix": 113, "pos": 1, "first": "Siiri", "last": "PAAVILAINEN", "club": "Nokian Judo", "country": "FIN" },
      { "ix": 88,  "pos": 2, "first": "Aino",  "last": "TERVONEN",   "club": "Espoon JK",   "country": "FIN" },
      { "ix": 54,  "pos": 3, "first": "Henna", "last": "KIVISTO",    "club": "Turun JS",    "country": "FIN" }
    ]
  }
]
```

Fields used:
- `category` — combined code in the form `{categoryCode}-{weight}` (e.g. `T15-44`, `M+100`); parsed into `CompetitionCategory.code` + `weightClass`
- `competitors[].pos` — placement (1 = gold, 2 = silver, 3 = bronze; ties share the same number)
- `competitors[].first`, `.last`, `.club`, `.country` — populate `Result.firstName` / `.lastName` / club lookup / country

### 11.2 Press results output format

`text/plain`. No login required. One category block per category, separated by a blank line:

```
{Category label}
{1}. {Last} {First}, {Club}; {2}. {Last} {First}, {Club}; …
```

Example:

```
Men under 66 kg
1. Tolonen Urho, Koyama; 2. Hätinen Riku, Koyama; 3. Suvanto Aleksi, Koyama; 3. Kolehmainen Tauno, Helsingin JS

Women over 78 kg
1. Marttinen Satu, Tampereen Judo; 2. Savolainen Pirjo, Espoon JK
```

Category label:
- Built from `CompetitionCategory` (`nameEn` / `nameFi` per locale) + weight class label
- Weight rendered as "under X kg" / "over X kg" (en) or "alle X kg" / "yli X kg" (fi)
- Category ordering = order in source `results.json` — no re-sorting

Data source: `results.json` in the competition's SFTP directory. Empty body if not yet uploaded.

### 11.3 Match history input

`MatchHistory` rows are derived from raw JudoShiai match-result files uploaded to the competition's SFTP directory. Each row records: competitor search keys (normalised `firstname_lastname` lowercase), points scored, competition name, date, category code. Used for StarttiCup eligibility (§10.3) and Samurai Cup (§8.10).

### 11.4 Per-competition extra registration fields (`Competition.extraFieldsConfig`)

Stored as `Json` on `Competition`. Defines additional per-competitor fields rendered on the registration form for that competition.

```json
[
  { "fi": { "t": "col1", "b": "Paino" }, "en": { "t": "col1", "b": "Weight" } },
  { "fi": { "t": "col2", "b": "Leiri" }, "en": { "t": "col2", "b": "Camp" } }
]
```

- `t` — internal column key; used as the key in `Competitor.extraFieldValues`
- `b` — display label shown on the registration form

### 11.5 Object storage layout

Final choice between Supabase Storage and S3 deferred (D23). Logical layout:

```
profile-photos/{userId}/{filename}
competitions/{competitionId}/video-html/index.html      (when useCustomVideoHtml = true)
competitions/{competitionId}/registration-attachments/{competitorId}/{filename}
```

---

## 12. Decision Log

Records the resolution of the 23 conflicts identified during the merge from the legacy `docs/specifications.md` into this document. Items are referenced by their original conflict IDs (Cn) and renamed Dn here for "Decision".

| # | Topic | Decision |
|---|---|---|
| **D1** | PK / timestamp types | Use `String @id @default(cuid())` and `DateTime` everywhere. Legacy `BIGSERIAL` / `TIMESTAMPTZ` discarded. |
| **D2** | Future role list | Adopt the full legacy role set (12 roles). See §3. |
| **D3** | `type` vs `level` | Keep both. `CompetitionType` (TOURNAMENT / CHAMPIONSHIP / KATA / CAMP / OPEN / INTERNATIONAL) is scrape-derived; `CompetitionLevel` (SM / NSM / SC / FJO / KV / STARTTI_CUP / KATA / TEAM / MUU) is the federation classification. See §5.1. |
| **D4** | Categories storage | Use the legacy model: separate `CompetitionCategory` table (§5.2). Drop the previous flat `categories String[]` / `weightCategories String[]` arrays. |
| **D5** | `status` vs `registrationOpen` | Keep derived `status`; add explicit `registrationOpen Boolean` flag. See §5.1. |
| **D6** | Operational fields on Competition | Added: address, geographicArea, numberOfTatamiMats, targetRefereeCount, matchDurationMinutes, staff FKs, useCustomVideoHtml, extraFieldsConfig, infoUrl, resultsUrl, previousYearReference. See §5.1. |
| **D7** | Capacity semantics | `capacity Int?` — `null` = no limit. Legacy `0` = no limit discarded. |
| **D8** | Result name fields | Split into `firstName` + `lastName`. See §5.5. |
| **D9** | Combined vs split category | Split fields in DB (`categoryId` FK + `weightClass`); parse JudoShiai's combined `"T15-44"` form on ingest. See §5.5 / §11.1. |
| **D10** | Gender enum | Added `UNKNOWN` value; `Competitor.gender` defaults to `UNKNOWN`. See §5.3. |
| **D11** | Club representation | `Club` model with optional `clubId` FK on `Competitor` / `Result` / `TeamEntry`, plus free-text `clubName` fallback. See §5.4 / §5.3 / §5.5 / §5.8. |
| **D12** | Match vs match history | Both: `Match` for per-tournament bracket data (§5.6), separate `MatchHistory` for cross-competition aggregated history (§5.7). |
| **D13** | `MatchRound` enum | Dropped. JudoShiai does not expose round info. See §5.6. |
| **D14** | Competitor schema | Use the legacy registration-oriented schema (split names, optional phone/email/yearOfBirth/categoryId at DB layer; required by registration validation; `removed` soft-delete; `licenseValid` / `ageEligible` flags; `extraFieldValues`; `registeredById`). DB will be dropped and recreated. See §5.3. |
| **D15** | Belt grade representation | `JudoGrade` enum (K6…K1, D1…D10) replaces the previous free-text `beltRank`. See §5.3. |
| **D16** | Competitor name fields | Split into `firstName` + `lastName`. See §5.3. |
| **D17** | VideoFeed representation | Keep free-text `name`; add optional `tatamiNumber Int?` (1–4 when normalised). See §5.9. |
| **D18** | Information tab semantics | Keep the current new-implementation static Information tab (description + pill tags). Drop the legacy document-CMS feature (bilingual menu, iframe, HTML-page editor, file uploads, global materials library). |
| **D19** | Kata / Team data model | New `TeamEntry` + `TeamEntryMember` models (§5.8). `TeamEntryType = KATA \| TEAM`. Members reference `Competitor` rows; optional `TeamMemberRole` (TORI/UKE) for kata. |
| **D20** | Press results name format | Resolved by D8 / D16 — split names enable correct `"Last First"` output. |
| **D21** | SFTP usernames | Use slug-based names: `r-{slug}` (results operator) and `v-{slug}` (video operator). Numeric IDs not required. |
| **D22** | Two name representations on Competitor | Single representation: `firstName` / `lastName` only. No combined `name` field. |
| **D23** | Document / asset storage | Object storage (Supabase Storage **or** S3) for binary assets — profile photos, future registration attachments, optional video HTML override. Final choice deferred. |

---

## 13. Repository Structure

```
/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── competitions/[slug]/tabs/route.ts
│   │   └── [locale]/
│   │       ├── page.tsx                        # Home
│   │       ├── competitions/
│   │       │   ├── page.tsx                    # Competition list
│   │       │   ├── CompetitionFilters.tsx
│   │       │   └── [slug]/
│   │       │       ├── layout.tsx              # Shared header + sub-nav + cache provider
│   │       │       ├── page.tsx                # Information tab (server component)
│   │       │       ├── athletes/page.tsx
│   │       │       ├── matches/page.tsx
│   │       │       ├── results/page.tsx
│   │       │       └── livestreams/page.tsx
│   │       ├── athletes/
│   │       └── history/
│   │           ├── page.tsx
│   │           └── HistorySearch.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── CompetitionCard.tsx
│   │   ├── CompetitionSubNav.tsx
│   │   ├── CompetitionTabsProvider.tsx
│   │   ├── CompetitorTable.tsx
│   │   ├── Badge.tsx
│   │   ├── CapacityBar.tsx
│   │   ├── ResultsTable.tsx
│   │   ├── SearchInput.tsx
│   │   └── WinLossBar.tsx
│   ├── lib/
│   │   ├── db.ts                               # Prisma singleton (pg adapter)
│   │   └── competitionTabCache.ts
│   ├── i18n/
│   │   ├── routing.ts
│   │   └── request.ts
│   └── messages/
│       ├── fi.json
│       └── en.json
├── prisma/
│   └── schema.prisma                           # Shared schema — target spec is §5
├── scraper/                                    # ⚠ DEPRECATED — interim write path; to be removed (see §2)
│   ├── src/
│   │   ├── index.ts
│   │   ├── scrapers/{list,detail}.ts
│   │   └── utils/{parse,slug}.ts
│   └── prisma.config.ts                        # References ../prisma/schema.prisma
└── docs/
    ├── spec.md                                 # This document — main specification
    ├── requirements.md                         # Product requirements (legacy + planned)
    ├── specifications.md                       # Legacy technical specifications (merge source)
    └── appendix-clubs.md                       # 140 Finnish judo clubs
```
