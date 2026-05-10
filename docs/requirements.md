# Judokisa — Product Requirements Document

> **Purpose:** This document captures the *what* and *why* of the Judokisa system — complete enough for Claude to design and build a new implementation from scratch. Implementation details from the original codebase have been intentionally omitted.

---

## 1. System Overview

**Judokisa** is a web application used by the Finnish Judo Federation (Judoliitto) to manage the full lifecycle of judo competitions in Finland — from creating a competition and recruiting referees, to registering competitors and publishing live results. It also tracks referee careers, licenses, and training.

**Core problem it solves:** Before this system, competition organizers had no unified platform to coordinate referees, accept competitor registrations, validate licenses, and publish results. The Federation needed a single source of truth for all competitions, connected to the national sports database.

**Primary language:** Finnish UI with English support for international events.

---

## 2. User Roles & Permissions

The system has distinct roles with specific capabilities. A user may hold multiple roles simultaneously.

| Role | Key Capabilities |
|---|---|
| **Administrator** | Full access to everything: create/edit/delete competitions, manage all users, system configuration |
| **Commission** | Create international (KV-level) competitions, add referees, assign roles |
| **Coordinator** | Read reports, manage calendar entries, add referees to the system |
| **Competition Manager** | Recruit referees for competitions in their region, access active referee contact lists |
| **Competition Assistant** | Same capabilities as Competition Manager |
| **Competition Responsible** | See invited/confirmed referees and their contacts, edit competition logistics |
| **Course Instructor** | Manage referee training courses and participant lists |
| **Referee** | View own profile, register for competitions, accept/decline referee invitations |
| **JudoShiai Operator** | Upload live match results via SFTP |
| **Video Operator** | Manage video streaming links for a competition |
| **Registrant** (public) | Register competitors for competitions, update their own personal profile information |
| **Public** (unauthenticated) | View competitions, watch live results, register competitors |

---

## 3. Core Entities

### Competition (Contest)
Represents a judo competition event.

**Attributes:**
- Name, city/venue, full address
- Start date, end date
- Registration deadline
- Geographic area (Southwest / West / North / East / Southeast / South)
- Number of tatami mats
- Target number of referees needed
- Match duration (minutes per bout)
- Competition level: SM (Finnish Senior), NSM (Finnish Non-Senior), SC (Swedish), FJO (Finnish Youth), KV (International), Muu (Other), StarttiCup (Beginners), Kata, Team
- Registration open/closed flag
- Maximum competitor capacity
- Current competitor count
- Up to 4 video stream URLs (one per tatami)
- Optional custom video HTML page toggle
- Custom per-competition extra competitor data fields (configurable — e.g. "Weight category note" or "Training camp")
- Reference to responsible person, competition manager, assistant, JudoShiai operator, video operator

**Competition Categories:**
Each competition has configurable categories for men/boys and women/girls. Each category has:
- Short code (e.g. `M`, `N`, `P18`, `T15`)
- English name and Finnish name
- Minimum age and maximum age (0 = no limit)
- Gender eligibility: `men` / `women` / `both`
- List of weight classes

The default category set and their standard weight classes are:

| Code | Name (EN) | Name (FI) | Min age | Max age | Gender | Weight classes |
|---|---|---|---|---|---|---|
| M | Men | Miehet | 18 | — | Men | -60, -66, -73, -81, -90, -100, +100 |
| M21 | U21 men | U21 miehet | 18 | 21 | Men | -55, -60, -66, -73, -81, -90, +90 |
| P18 | U18 boys | U18 pojat | 15 | 18 | Men | -45, -50, -60, -66, -73, -81, +81 |
| P15 | U15 boys | U15 pojat | 13 | 15 | Men | -34, -38, -42, -46, -50, -55, -60, -66, +66 |
| P13 | U13 boys | U13 pojat | 11 | 13 | Men | -30, -34, -38, -42, -46, -50, -55, +55 |
| P11 | U11 boys | U11 pojat | 9 | 11 | Men | -27, -30, -34, -38, -42, -46, -50, -55, +55 |
| N | Women | Naiset | 18 | — | Women | -48, -52, -57, -63, -70, -78, +78 |
| N21 | U21 women | U21 naiset | 15 | 21 | Women | -48, -52, -57, -63, -70, +70 |
| T18 | U18 girls | U18 tytöt | 15 | 18 | Women | -44, -48, -52, -57, -63, +63 |
| T15 | U15 girls | U15 tytöt | 13 | 15 | Women | -32, -36, -40, -44, -48, -52, -57, -63, +63 |
| T13 | U13 girls | U13 tytöt | 11 | 13 | Women | -28, -32, -36, -40, -44, -48, -52, +52 |
| T11 | U11 girls | U11 tytöt | 9 | 11 | Women | -25, -28, -32, -36, -40, -44, -48, -52, +52 |

Weight class notation: `-66` = under 66 kg (up to and including), `+100` = over 100 kg. Categories and weight classes are fully configurable per competition — the table above represents the standard defaults.

---

### User / Referee Profile
Represents a registered system user — primarily referees and administrators.

**Mandatory fields:** email (login identifier and notification address), first name, last name. Password is mandatory for email-based accounts; may be absent for social-auth-only accounts.

**Optional profile fields:** phone number, date of birth, postal address, club affiliation (free text — referees may belong to clubs not in the club table), geographic area (one of six Finnish regions), judo grade (6th kyu through 10th dan), referee license level (D / C / B / A / INT B / INT A), SuomiSport IDs (internal and public), active/inactive flag, profile photo, GDPR no-sync flag (blocks SuomiSport sync), blacklist flag (blocks system access), default competition category code (pre-fills registration forms), default weight class in kg (pre-fills registration forms).

**Role flags** (all boolean, all default false): referee, administrator, commission, coordinator, competition manager, competition assistant, competition responsible, course instructor, JudoShiai operator, video operator.

For field-level data types and constraints, see [Specifications §1: Database Schema](specifications.md#1-database-schema).

---

### Competition (Contest) — additional detail

The competition record also tracks per-competition staff assignments (responsible person, manager, assistant, JudoShiai operator, video operator), extra competitor data field definitions (configurable JSON schema for fields specific to that event), video stream URLs per tatami (up to 4), and a reference to a prior year's competition for continuity.

Referee invitations are tracked per competition with a status that progresses through: Asked → Declining / Promising / Agreed → Present.

Competition categories are defined per competition and include: short code, English and Finnish names, minimum age, maximum age, gender eligibility, and an ordered list of weight classes.

For the full field list and data types, see [Specifications §1: Database Schema](specifications.md#1-database-schema).

---

### Competitor

**Mandatory fields:** first name, last name, phone, email, competition category, year of birth, competition.

**Optional fields:** country (IOC code, default Finland), club, gender, judo grade, registrant (who registered them), license validity flag (null = not yet checked), age eligibility flag (null = not yet checked), soft-delete flag, extra field values for competition-specific data.

For field-level data types and constraints, see [Specifications §1: Database Schema](specifications.md#1-database-schema).

---

### Club

**Mandatory field:** display name (as used in Judokisa). **Optional:** country (default Finland), official SuomiSport name (null if no mapping established — 21 clubs currently have no mapping).

140 Finnish clubs are pre-loaded in the system. See [Appendix: Pre-loaded Finnish Judo Clubs](appendix-clubs.md) for the full list with both display names and SuomiSport mappings.

---

### Training Course

**Mandatory fields:** name, location, start date, end date.

**Optional fields:** level (Update / Main Training / Other / Seminar), SuomiSport course ID (set when synced from the national database). Each course has a list of instructors and a list of participating referees (many-to-many).

For field-level data types and constraints, see [Specifications §1: Database Schema](specifications.md#1-database-schema).

---

### Documents & Info Pages (per Competition)

Each competition has a document space containing:
- A **menu index** — a hierarchical list of menu items defining the navigation structure for that competition's info section
- **HTML content pages** — rich-text pages editable via a WYSIWYG editor within the system; raw HTML editing is also supported
- **Uploaded files** — PDFs, images, or other static files that menu items can link to

There is also a **global document space** (not tied to any competition) for general Federation materials.

**Menu structure:** Each item is one of: a dropdown header (with child items), an HTML content page link, an external URL link, or a file download link. Items can be marked hidden — excluded from the public menu but still accessible by direct URL. Item titles are bilingual (Finnish and English).

**Display:** The competition info tab renders as a navigation bar (dropdowns for nested items) with an inline frame below it. Clicking a menu item loads the corresponding page or file into the frame. The first available page loads automatically.

**Access:** Editing requires one of: competition manager, competition assistant, coordinator, commission, or administrator role. The global document space requires administrator role.

For storage format and menu structure details, see [Specifications §4: Competition Documents Storage Format](specifications.md#4-competition-documents-storage-format).

---

### Match History
A separate, regeneratable record of historical match results parsed from JudoShiai result files. Used for:
- Displaying past competition results
- Competitor win/loss statistics
- Samurai Cup points calculation
- StarttiCup eligibility checking

---

## 4. Feature Requirements

### 4.1 Competition Lifecycle Management

**Why:** The Federation needs to publish upcoming competitions and manage them from creation to post-event archival.

**Requirements:**
- Authorized roles can create competitions with all attributes
- Competitions appear in a public listing of upcoming events; past events are separately browsable
- The default view shows a limited number of upcoming competitions; a toggle expands to the full list
- Each competition has multiple public tab-views: overview, info/documents, competitor list, registration, live results, video streams
- Competition managers can edit logistics (tatami count, duration, referee count, venue) after creation
- A competition can reference a previous year's competition number for continuity
- The system tracks registered competitor count vs. maximum capacity

---

### 4.2 Referee Recruitment & Management

**Why:** For each competition, the right number of qualified referees must be recruited, confirmed, and tracked.

**Requirements:**
- A competition manager invites referees to a specific competition
- Invited referees receive an email notification with a link to respond
- Each referee can respond: Accept or Decline via a direct link (no login required for simple response)
- Invitations can also be accepted/declined by admins on a referee's behalf (for verbal confirmations)
- Referee status per competition progresses through: Asked → Refusing / Promising / Agreed → Present
- After the competition, the manager records who actually attended
- The system shows a list of all invited referees with their current status and contact details
- Referees can be browsed/filtered by geographic area for targeted regional recruitment
- Reports available:
  - **Report 1:** Referees by area with contact details and competition history
  - **Report 2:** Individual referee career history (courses attended, competitions refereed)
  - **Report 3:** International referee competition list

---

### 4.3 Competitor Registration

**Why:** Competitors must be registered for specific weight categories with validated licenses and age eligibility.

**Requirements:**
- Anyone can register competitors for a competition during the open registration window
- Registration requires: name, year of birth, gender, club, country, weight category, grade, contact info
- The system validates:
  - Competitor's judo license (checked against SuomiSport data)
  - Age eligibility for the chosen category
- Validation results are shown as flags — registration is allowed even with issues but issues are visible to organizers
- Available categories are filtered by competition config and competitor's gender
- A registrant can register multiple competitors from the same club in one session
- Registered competitors can be edited or soft-deleted by the registrant or admin
- Admin can view the full competitor list with all validation flags
- **Analyze function:** Scans all registrations for a competition and flags potential problems: reversed first/last names, birth year mismatches vs. SuomiSport, duplicate entries, license issues
- Registration can be manually closed by admins at any time (regardless of deadline)
- **StarttiCup (Beginners) restriction:** Competitors can only enter beginner-level competitions if they have not exceeded a win threshold in regular competitions (prevents experienced competitors from entering beginner events). See details in the following sections.

---

### 4.4 Bulk Registration via Excel

**Why:** Club coaches need to register many competitors at once efficiently.

**Requirements:**
- Download an Excel template pre-configured for a specific competition's categories
- Upload a completed Excel file to bulk-register competitors; errors are reported row by row
- Download current competitor list as Excel for record-keeping or re-use
- Download a "my club's previous competitors" Excel template pre-filled with the registrant's historical competitor data

---

### 4.5 Kata Registration

**Why:** Kata (forms) competitions use pairs of athletes, not individuals.

**Requirements:**
- Kata competitions accept pair registrations (two athletes per entry)
- Each pair entry has: Person 1 (name, club), Person 2 (name, club), category, grade
- Pairs can be edited after initial registration

---

### 4.6 Team Event Registration

**Why:** Some competitions include team events requiring grouped entries.

**Requirements:**
- Teams are registered as a group for a specific category
- Team registration is separate from individual competitor registration
- Teams have a team name and club affiliation

---

### 4.7 Live Results & Video Streaming

**Why:** Spectators and remote followers want to follow competition results in real time.

**Requirements:**
- Each competition has a results view that displays data uploaded by the JudoShiai operator
- Results are uploaded via SFTP; the system reads and renders them automatically
- Each competition can have up to 4 video stream URLs (one per tatami), displayed as embedded players
- A custom HTML page can optionally replace the default video layout
- A mobile-optimized view is available for use at the venue

---

### 4.8 SFTP User Management

**Why:** JudoShiai operators need secure file-upload access to exactly one competition's directory — no more.

**Requirements:**
- Each competition can have one results SFTP user and one video SFTP user
- Users are confined to their competition directory (cannot navigate outside it)
- Authentication uses SSH public key only — no passwords
- SSH keypairs are generated per competition; the private key is downloadable by admins
- SFTP users are provisioned and deprovisioned via the system (backed by server-side scripting)

For SFTP username conventions, SSH key type, and provisioning details, see [Specifications §7: SFTP User Management](specifications.md#7-sftp-user-management).

---

### 4.9 SuomiSport Integration

**Why:** The national judo federation database (SuomiSport) is the authoritative source for referee licenses, club names, and competitor certifications.

**Requirements:**
- The system syncs referee personal and license data from SuomiSport: name, club, license dates, grade, contact info, guardian contact for minors
- Competitor license validation uses synced SuomiSport data
- Referee training course completion records (merits) are synced from SuomiSport
- Syncs run as background jobs and can be manually triggered by admins
- The UI shows sync progress for long-running jobs
- Each system user can be linked to their SuomiSport ID
- Users can opt out of SuomiSport data sync (GDPR flag)

---

### 4.10 Samurai Cup Rankings

**Why:** The Federation runs a multi-event points series (Samurai Cup) to rank competitors across the season.

**Requirements:**
- The system calculates Samurai Cup standings for a selected year
- Points are aggregated across all competitions in the year that participate in the series
- **Points per competitor per competition:**
  - 1 point for participating
  - 1 point per match won
  - Placement bonus: 1st = 9 pts, 2nd = 6 pts, 3rd = 3 pts
- Rankings are per weight category
- **Tiebreaker order:** Total points → number of wins → 1st places → 2nd places → 3rd places → 4th–5th places → 6th–7th places → last name (alphabetical)
- Club standings are also produced by summing all competitors' points per club
- Output is a printable/shareable HTML page
- Rankings are generated on demand for a selected year

---

### 4.11 Competition Results for Press

**Why:** Journalists and press contacts need a clean, copy-paste-ready result list in a standardised format that can be dropped directly into a press release or news article without further editing.

**Requirements:**

**Output format:**
- Delivered as plain text (`text/plain`), viewable directly in a browser or saved as a file
- No HTML markup, no download prompt — raw text only
- One category per line, immediately followed by all its results on a single line, semicolon-separated
- Format per line: `[Category label]` on its own line, then `1. Last First, Club; 2. Last First, Club; 3. Last First, Club; …`

**Example output:**
```
Men under 66 kg
1. Tolonen Urho, Koyama; 2. Hätinen Riku, Koyama; 3. Suvanto Aleksi, Koyama; 3. Kolehmainen Tauno, Helsingin JS

Women over 78 kg
1. Marttinen Satu, Tampereen Judo; 2. Savolainen Pirjo, Espoon JK
```

**Category label format:**
- The full human-readable category name is used, derived from the competition's category definitions
- Weight class is expressed as "under X kg" (for `-66`) or "over X kg" (for `+100`)
- Labels are language-aware: Finnish when the UI language is Finnish ("alle 66 kg", "yli 78 kg"), English otherwise

**Data source:**
- Results are read exclusively from the result file uploaded by the JudoShiai operator via SFTP — not from the competitor registration table
- If no results file has been uploaded yet, the view returns nothing

For the exact file format, see [Specifications §2: JudoShiai File Formats](specifications.md#2-judoshiai-file-formats).

**Category ordering:**
- Categories appear in the order they exist in the uploaded results file — no re-sorting is applied

**Placements shown:**
- All placements are shown (1st, 2nd, 3rd, and beyond) — there is no cutoff
- Tied positions (e.g. two 3rd places) are both listed with the same position number

**Access:**
- Publicly accessible — no login required
- Available for any competition that has a results file uploaded

---

### 4.12 Competition Documents & Info

**Why:** Each competition has specific information (schedules, rules, accommodation, maps, entry fees) that must be published to participants and the public.

**Requirements:**
- Authorized users build a navigation menu for the competition's info tab, with items in Finnish and English
- Menu items can be: a dropdown header (with child items), a link to an HTML content page, a link to an uploaded file, or a link to an external URL
- Menu items can be hidden from public display (used to keep files accessible by direct URL without showing them in the nav)
- HTML content pages are written and edited via a WYSIWYG editor within the system; raw HTML editing is also supported
- Files (PDFs, images, other assets) can be uploaded and attached to menu items
- Menu structure and item order are editable via drag-and-drop
- The info tab renders the menu as a navigation bar; clicking an item loads the corresponding page into an inline frame
- The first available page loads automatically when the info tab is opened
- All content is publicly accessible (no login required to view)
- Editing access is limited to: competition manager, competition assistant, coordinator, commission, administrator

---

### 4.13 Global Materials Library

**Why:** The Federation publishes general judo resources (rulebooks, forms, guidelines) not tied to any specific competition.

**Requirements:**
- A global document space with the same menu-building, file-upload, and HTML-editing capabilities as competition documents
- Accessible from the main navigation for all visitors
- Editing access limited to administrators

---

### 4.14 User Account Management

**Why:** Referees, managers, and other staff need accounts to access their respective functions.

**Requirements:**
- Users register via email or social login (Google, Facebook, GitHub, LinkedIn, Twitter)
- Email-based registration requires email verification
- Password reset by email
- Users can edit their own profile: contact details, photo, area, grade
- Admins can create, edit, deactivate, and view any user account
- Admins assign roles to users
- Registrants (club representatives who register competitors but are not referees) can be added by admins
- GDPR compliance: users can be flagged to block SuomiSport sync; full user data deletion is supported
- A user blacklist prevents specific individuals from using the system

---

### 4.15 Language Support

**Why:** International competitions require English; Finnish is the daily working language.

**Requirements:**
- UI is available in Finnish (default) and English
- Users can switch language at any time; preference is persisted
- Competition info menus and content can have Finnish and English versions
- All system labels and messages are translatable

---

## 5. Business Rules

### Competition Levels
| Code | Meaning |
|---|---|
| SM | Finnish Senior Masters (main national championships) |
| NSM | Finnish Non-Senior Masters |
| SC | Swedish Competition (Nordic cross-border) |
| FJO | Finnish Youth Organization events |
| KV | International competition (requires Commission role to create) |
| StarttiCup | Beginner-level competition series |
| Kata | Forms/kata competition |
| Team | Team event competition |
| Muu | Other / unclassified |

### Category Definition Rules
- Categories are defined per competition
- Each category specifies: code, English name, Finnish name, minimum age, maximum age (0 = no max), gender, weight classes
- Age eligibility uses year of birth vs. competition year (not exact birthdate)
- Weight class notation: `-66` = under 66 kg, `+100` = over 100 kg
- Category gender eligibility: `men` / `women` / `both`

### Referee Invitation States
```
Asked → Refusing (declined by referee)
Asked → Promising (indicated willingness)
Asked → Agreed (confirmed, e.g. verbally via manager)
Agreed → Present (attended, recorded after event)
```

### License Validation
- A competitor's license is valid if SuomiSport has an active (non-expired) license record for them
- License status is a flag — it does not block registration but is prominently visible to organizers
- Name or birth year mismatches between registration and SuomiSport data are also flagged separately

### StarttiCup Eligibility
- A competitor is flagged as ineligible for StarttiCup if they have **more than 5 wins** in regular-level competitions (i.e. 6 or more wins triggers the flag)
- Only wins from Finnish competitors are checked; foreign competitors (non-FIN) bypass the check entirely
- Wins in other beginner-type events (recognized by naming conventions) are excluded from the count to avoid double-penalising beginners
- Win count is derived from the match history database
- The flag does not hard-block registration; it is surfaced as a warning visible to organizers during the analyze step

For the exact query logic and beginner-event name patterns used, see [Specifications §8: StarttiCup Eligibility Logic](specifications.md#8-startticum-eligibility-logic).

### SFTP Access Security
- SFTP users have no shell access; they are confined to their competition directory only
- Only SSH key authentication is allowed — password authentication is disabled
- Private keys are generated once per competition and downloadable only by admins

### Geographic Areas
Finland is divided into 6 areas for referee recruitment and reporting:
South West, West, North, East, South East, South.

---

## 6. External Integrations

### SuomiSport (Finnish Sports Federation Database)
- **What:** OAuth2-authenticated REST API
- **Why:** Authoritative source for referee licenses, competitor certifications, and club master data
- **Data consumed:** Referee personal data, license periods, judo grade, training course completions, club info, guardian contacts for minors
- **Direction:** SuomiSport → Judokisa (read-only sync)
- **Trigger:** Background job, manually triggered by admin or scheduled

### JudoShiai (Competition Management Software)
- **What:** Desktop software used by referees during competitions to manage brackets and record match results
- **Why:** Live and final results come from JudoShiai — they are not entered manually into Judokisa
- **Data consumed:** Competitor list (JSON), match results (JSON), final standings (JSON)
- **Integration:** JudoShiai operator uploads files to the competition's SFTP directory; Judokisa reads and displays them

### Email (Outbound)
- **Why:** Referee invitations, account email verification, password reset notifications
- **Delivery:** SMTP

### Social Authentication
- **Why:** Lower barrier to account creation for referees and club representatives
- **Providers:** Google, Facebook, GitHub, LinkedIn, Twitter

---

## 7. Non-Functional Requirements

### Access Control
- All sensitive pages enforce role checks; unauthorized access returns a clear message
- Public pages (competition list, competitor list, live results) require no login
- Registration may be open to anonymous users or require login depending on context

### Data Integrity
- Competitor records are never hard-deleted; a removal flag is used for soft deletes
- Competition records are retained indefinitely as historical records
- The match history database can be fully regenerated from stored JudoShiai result files

### Backup & Recovery
- Automated nightly database backups with at least 14-day retention
- Match history is regenerable from source files (not critical to back up separately)

### Performance
- Public competition and results pages should be cacheable (high read volume, infrequent writes)
- SuomiSport syncs run in the background and must not block the UI

### Internationalisation
- Date formats follow Finnish convention (DD.MM.YYYY) for Finnish locale
- All user-visible strings support Finnish and English translation

---

## 8. Key Screens / Navigation Structure

```
Public
├── Competition list (upcoming)
├── Competition list (past)
└── Competition detail
    ├── Tab: Overview (name, dates, place, registration status, referee count)
    ├── Tab: Info & Documents (configurable menu + downloadable files)
    ├── Tab: Competitor list (by category)
    ├── Tab: Registration (individual / kata / team forms)
    ├── Tab: Live results (JudoShiai data)
    └── Tab: Video streams (per tatami)

Authenticated — Referee
├── My profile (edit personal data, view competition/course history)
├── Pending invitations (accept / decline)
└── Course list

Authenticated — Manager / Admin
├── Competition management
│   ├── Create competition
│   ├── Edit competition details & categories
│   ├── Manage referees (invite, track responses, mark attendance)
│   ├── Manage competitor registrations (view, flag, analyze, close)
│   ├── Upload documents & edit info menu
│   └── Manage SFTP users & download SSH keys
├── Referee management
│   ├── Referee directory (filterable by area)
│   ├── Reports (area report, individual history, international list)
│   └── Course management (create, edit, participant list)
├── User management (admin only)
│   ├── User list & search
│   ├── Create / edit / deactivate user
│   └── GDPR management
├── Club management
├── SuomiSport sync (trigger & monitor progress)
└── Samurai Cup rankings (select year → generate standings)
```

---

## 9. Data Volumes & Scale Indicators

- 140 Finnish judo clubs pre-loaded (see [appendix](appendix-clubs.md))
- Dozens to hundreds of competitions per year (national + local + international)
- Up to several hundred competitors per large competition
- Dozens of referees per competition
- Referee database: hundreds of active registered referees
- Full IOC country list (~200 countries) for international competitor nationality selection
