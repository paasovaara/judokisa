# Judokisa — Technical Specifications

> This document covers concrete implementation details: database schema, file formats, integration protocols, and data conventions.
> For product-level requirements (what the system does and why) see [requirements.md](requirements.md).

---

## 1. Database Schema

Target database: **PostgreSQL**. All timestamps are stored with timezone (`TIMESTAMPTZ`). All surrogate primary keys use `BIGSERIAL`.

### 1.1 `user`

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| Email | `VARCHAR(254)` | **Mandatory** | Unique; used as login identifier and for notifications |
| Password | `VARCHAR(128)` | **Mandatory** | Stored as hash; may be absent if social auth only |
| First name | `VARCHAR(150)` | **Mandatory** | |
| Last name | `VARCHAR(150)` | **Mandatory** | |

### 1.2 `user_profile` (one-to-one with `user`)

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| User | `BIGINT` FK → `user` | **Mandatory** | Unique; cascade delete |
| Is referee | `BOOLEAN` | Optional | Default `false` |
| Is administrator | `BOOLEAN` | Optional | Default `false` |
| Is commission | `BOOLEAN` | Optional | Default `false` |
| Is coordinator | `BOOLEAN` | Optional | Default `false` |
| Is competition manager | `BOOLEAN` | Optional | Default `false` |
| Is competition assistant | `BOOLEAN` | Optional | Default `false` |
| Is competition responsible | `BOOLEAN` | Optional | Default `false` |
| Is course instructor | `BOOLEAN` | Optional | Default `false` |
| Is JudoShiai operator | `BOOLEAN` | Optional | Default `false` |
| Is video operator | `BOOLEAN` | Optional | Default `false` |
| Phone number | `VARCHAR(32)` | Optional | |
| Date of birth | `DATE` | Optional | |
| Address | `VARCHAR(255)` | Optional | |
| Club | `VARCHAR(64)` | Optional | Free-text; referees may belong to clubs not in the `club` table |
| Geographic area | `VARCHAR(3)` | Optional | Enum: `LOU` / `LAN` / `POH` / `ITA` / `KAA` / `ETE`; default unknown |
| Judo grade | `VARCHAR(4)` | Optional | Enum: `6k`…`1k`, `1d`…`10d`; default ungraded |
| Referee license level | `VARCHAR(8)` | Optional | Enum: `D` / `C` / `B` / `A` / `INT_B` / `INT_A`; default none |
| SuomiSport internal ID | `INTEGER` | Optional | Internal SuomiSport row identifier |
| SuomiSport person ID | `INTEGER` | Optional | Public SuomiSport person ID |
| Active | `BOOLEAN` | Optional | Default `true` |
| Profile photo | `TEXT` | Optional | Server-relative file path |
| GDPR no-sync flag | `BOOLEAN` | Optional | Default `false`; blocks SuomiSport data sync |
| Blacklisted | `BOOLEAN` | Optional | Default `false`; blocks system access |
| Default category code | `VARCHAR(8)` | Optional | Preferred competition category, e.g. `M`, `T18`; used to pre-fill registration forms |
| Default weight class | `SMALLINT` | Optional | Preferred weight class in kg; negative = "under X" (e.g. `-66`), positive = "over X" (e.g. `100`); used to pre-fill registration forms |

### 1.3 `competition`

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| Name | `VARCHAR(64)` | **Mandatory** | |
| City / venue | `VARCHAR(64)` | **Mandatory** | |
| Start date | `DATE` | **Mandatory** | |
| End date | `DATE` | **Mandatory** | |
| Address | `VARCHAR(128)` | Optional | Default empty |
| Geographic area | `VARCHAR(3)` | Optional | Same enum as `user_profile`; default unknown |
| Registration deadline | `DATE` | Optional | Null if not set |
| Number of tatami mats | `SMALLINT` | Optional | Default `3` |
| Target referee count | `SMALLINT` | Optional | Default `0` |
| Match duration (minutes) | `SMALLINT` | Optional | Default `7` |
| Competition level | `VARCHAR(16)` | Optional | Enum: `SM` / `NSM` / `SC` / `FJO` / `KV` / `Muu` / `StarttiCup` / `Kata` / `Team`; default `Muu` |
| Registration open | `BOOLEAN` | Optional | Default `false` |
| Maximum competitor capacity | `INTEGER` | Optional | Default `0` (no limit) |
| Current competitor count | `INTEGER` | Optional | Maintained by system; default `0` |
| Responsible person | `BIGINT` FK → `user` | Optional | Nullable |
| Competition manager | `BIGINT` FK → `user` | Optional | Nullable |
| Competition assistant | `BIGINT` FK → `user` | Optional | Nullable |
| JudoShiai operator | `BIGINT` FK → `user` | Optional | Nullable |
| Video operator | `BIGINT` FK → `user` | Optional | Nullable |
| Use custom video HTML | `BOOLEAN` | Optional | Default `false` |
| Extra competitor field definitions | `JSONB` | Optional | Array of field label configs; default `[]` — see §5.1 |
| Info URL | `TEXT` | Optional | External link; nullable |
| Results URL | `TEXT` | Optional | External link; nullable |
| Previous year reference | `INTEGER` | Optional | Reference to prior year's competition ID |

### 1.4 `competition_video_stream` (child of `competition`)

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| Competition | `BIGINT` FK → `competition` | **Mandatory** | Cascade delete |
| Tatami number | `SMALLINT` | **Mandatory** | 1–4 |
| Stream URL | `TEXT` | **Mandatory** | YouTube or other stream URL |

### 1.5 `competition_referee_invitation`

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Competition | `BIGINT` FK → `competition` | **Mandatory** | Composite PK with referee |
| Referee | `BIGINT` FK → `user` | **Mandatory** | Composite PK with competition |
| Status | `VARCHAR(10)` | **Mandatory** | Enum: `ASKED` / `DECLINED` / `PROMISED` / `AGREED` / `PRESENT` |
| Invited at | `TIMESTAMPTZ` | **Mandatory** | When the invitation was sent |

### 1.6 `competition_category` (child of `competition`)

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| Competition | `BIGINT` FK → `competition` | **Mandatory** | Cascade delete |
| Code | `VARCHAR(8)` | **Mandatory** | e.g. `M`, `N`, `P18`, `T15` |
| English name | `VARCHAR(64)` | **Mandatory** | |
| Finnish name | `VARCHAR(64)` | **Mandatory** | |
| Minimum age | `SMALLINT` | **Mandatory** | `0` = no minimum |
| Maximum age | `SMALLINT` | **Mandatory** | `0` = no maximum |
| Gender | `VARCHAR(10)` | **Mandatory** | Enum: `men` / `women` / `both` |
| Weight classes | `SMALLINT[]` | **Mandatory** | Ordered array; negative = "under X kg" (e.g. `-66`), positive = "over X kg" (e.g. `100` means `+100`) |

### 1.7 `competitor`

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| First name | `VARCHAR(64)` | **Mandatory** | |
| Last name | `VARCHAR(150)` | **Mandatory** | |
| Phone | `VARCHAR(32)` | **Mandatory** | |
| Email | `VARCHAR(150)` | **Mandatory** | |
| Category | `BIGINT` FK → `competition_category` | **Mandatory** | |
| Year of birth | `SMALLINT` | **Mandatory** | Four-digit year |
| Competition | `BIGINT` FK → `competition` | **Mandatory** | |
| Country | `CHAR(3)` | Optional | IOC 3-letter code; default `FIN` |
| Club | `BIGINT` FK → `club` | Optional | Nullable |
| Gender | `VARCHAR(10)` | Optional | Enum: `male` / `female` / `unknown`; default `unknown` |
| Judo grade | `VARCHAR(4)` | Optional | Same enum as user profile grade; default ungraded |
| Registered by | `BIGINT` FK → `user` | Optional | Who registered them; nullable |
| License valid | `BOOLEAN` | Optional | `null` = not yet checked |
| Age eligible | `BOOLEAN` | Optional | `null` = not yet checked |
| Removed | `BOOLEAN` | Optional | Soft-delete; default `false` |
| Extra field values | `JSONB` | Optional | Values for competition-specific extra fields; default `{}` |

### 1.8 `club`

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| Display name | `VARCHAR(64)` | **Mandatory** | Name as used in Judokisa |
| Country | `CHAR(3)` | Optional | IOC 3-letter code; default `FIN` |
| SuomiSport name | `VARCHAR(128)` | Optional | Official name in SuomiSport; `null` if no mapping established |

140 Finnish clubs are pre-loaded. See [Appendix: Pre-loaded Finnish Judo Clubs](appendix-clubs.md).

### 1.9 `course`

| Field | Type | Mandatory? | Notes |
|---|---|---|---|
| Primary key | `BIGSERIAL` | — | |
| Name | `VARCHAR(64)` | **Mandatory** | |
| Location | `VARCHAR(64)` | **Mandatory** | |
| Start date | `DATE` | **Mandatory** | |
| End date | `DATE` | **Mandatory** | |
| Level | `VARCHAR(2)` | Optional | Enum: `UP` (Update) / `MA` (Main Training) / `OT` (Other) / `SE` (Seminar); null = unknown |
| SuomiSport course ID | `INTEGER` | Optional | Null until synced from SuomiSport |

### 1.10 `course_instructor` (many-to-many: course ↔ user)

| Field | Type | Notes |
|---|---|---|
| Course | `BIGINT` FK → `course` | Composite PK |
| Instructor | `BIGINT` FK → `user` | Composite PK |

### 1.11 `course_participant` (many-to-many: course ↔ user)

| Field | Type | Notes |
|---|---|---|
| Course | `BIGINT` FK → `course` | Composite PK |
| Participant | `BIGINT` FK → `user` | Composite PK |

### 1.12 SuomiSport sync cache tables

These tables are local read-only caches populated by the SuomiSport background sync. They are never written to by users.

**`suomisport_licence`** — referee license records

| Field | Type | Notes |
|---|---|---|
| Primary key | `BIGSERIAL` | |
| SuomiSport person ID | `INTEGER` | |
| SuomiSport internal ID | `INTEGER` | |
| First name | `VARCHAR(64)` | |
| Last name | `VARCHAR(150)` | |
| Club | `VARCHAR(32)` | |
| License start date | `VARCHAR(16)` | As returned by SuomiSport API |
| License end date | `VARCHAR(16)` | As returned by SuomiSport API |
| Email | `VARCHAR(254)` | |
| Address | `VARCHAR(128)` | |
| Phone | `VARCHAR(32)` | |
| Date of birth | `VARCHAR(16)` | As returned by SuomiSport API |
| Gender flags | `INTEGER` | Bitmask: bit 0 = male, bit 1 = female, bit 2 = guardian phone present, bit 3 = guardian email present |

**`suomisport_merit`** — available certification/course types

| Field | Type | Notes |
|---|---|---|
| Primary key | `BIGSERIAL` | |
| SuomiSport internal ID | `INTEGER` | |
| Merit group ID | `INTEGER` | |
| Name | `VARCHAR(64)` | |
| Merit group name | `VARCHAR(32)` | |
| Description | `VARCHAR(64)` | |

**`suomisport_granted_merit`** — certifications granted to individuals

| Field | Type | Notes |
|---|---|---|
| Primary key | `BIGSERIAL` | |
| Merit number | `INTEGER` | |
| SuomiSport internal ID | `INTEGER` | FK into `suomisport_licence` |
| Merit ID | `INTEGER` | FK into `suomisport_merit` |
| Merit group ID | `INTEGER` | |
| Granted date | `VARCHAR(16)` | As returned by SuomiSport API |
| Merit name | `VARCHAR(64)` | |
| Merit group name | `VARCHAR(32)` | |

---

## 2. JudoShiai File Formats

JudoShiai is external desktop software used at competitions. It uploads result files to the competition's SFTP directory; Judokisa reads them for display. Files are JSON.

### 2.1 `results.json` — final competition standings

Array of category objects. Used by the live results view, the press results view, and as input for Samurai Cup calculations.

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

Key fields used by Judokisa:
- `category` — combined code in the form `{category_code}-{weight}` (e.g. `T15-44`, `M+100`)
- `competitors[].pos` — placement (1 = gold, 2 = silver, 3 = bronze; ties share the same number)
- `competitors[].first`, `.last`, `.club` — display fields

### 2.2 Match history input

The match history database is built from raw match result files uploaded by JudoShiai operators. Individual match records include: competitor search keys (normalised `firstname_lastname`), points scored, competition name, date, and category.

---

## 3. Match History Database

In the current version the match history is stored in a separate SQLite3 database (not the main PostgreSQL database). It can be fully regenerated from the stored JudoShiai result files and is therefore not included in critical backups. This is however something we want to change in the next version and store it alongside the existing database.

**Table: `matches`**

| Field | Notes |
|---|---|
| `id` | Row identifier |
| `search1` | Normalised key for competitor 1: `firstname_lastname` (lowercase) |
| `search2` | Normalised key for competitor 2 |
| `points1` | Points scored by competitor 1 in this match (>0 = win) |
| `points2` | Points scored by competitor 2 |
| `competition` | Competition name as a string |
| `date` | Competition date |
| `category` | Category code (e.g. `T15-44`) |
| `id1`, `id2` | Competitor identifiers from JudoShiai |

This database is queried for StarttiCup eligibility checks and Samurai Cup points calculations.

---

## 4. Competition Documents — Storage Format

Each competition has a dedicated directory on the server filesystem. The global materials library uses the same structure under a reserved directory (id = 0).

### 4.1 Directory structure

```
media/
  {competition_id}/
    index.json          ← menu structure
    info.html           ← example HTML content page
    schedule.html
    rules.pdf           ← uploaded file
    photo.jpg
  0/                    ← global materials library
    index.json
    ...
```

### 4.2 `index.json` — menu structure

Array of menu items. Each item has a `type` field:

```json
[
  {
    "type": "menu",
    "title_fi": "Kilpailutiedot",
    "title_en": "Competition info",
    "menu": [
      {
        "type": "document",
        "title_fi": "Ohjelma",
        "title_en": "Schedule",
        "url": "schedule.html"
      },
      {
        "type": "link",
        "title_fi": "Kartta",
        "title_en": "Map",
        "url": "https://maps.example.com/venue"
      }
    ]
  },
  {
    "type": "document",
    "title_fi": "Säännöt",
    "title_en": "Rules",
    "url": "rules.pdf"
  }
]
```

Item types:
- `menu` — dropdown header with nested `menu` array of child items; not itself clickable
- `document` — links to a file (HTML page or uploaded asset) in the same directory; loaded in-page
- `link` — external URL; opens in a new browser tab

A title prefixed with `-` (e.g. `"-Piilotettu"`) hides the item from the public navigation bar while keeping the file accessible by direct URL.

### 4.3 Extra competitor field definitions (`competition.extra_fields_config`)

Stored as `JSONB` on the `competition` row. Defines additional per-competitor fields that appear on the registration form for that specific competition.

```json
[
  {
    "fi": { "t": "col1", "b": "Paino" },
    "en": { "t": "col1", "b": "Weight" }
  },
  {
    "fi": { "t": "col2", "b": "Leiri" },
    "en": { "t": "col2", "b": "Camp" }
  }
]
```

- `t` — internal column key used as the key in `competitor.extra_field_values`
- `b` — display label shown on the registration form

---

## 5. Press Results — Output Format

The press results endpoint returns `text/plain`. No login required.

### 5.1 Format

One category block per category, separated by a blank line:

```
{Category label}
{1}. {Last} {First}, {Club}; {2}. {Last} {First}, {Club}; …
```

### 5.2 Example

```
Men under 66 kg
1. Tolonen Urho, Koyama; 2. Hätinen Riku, Koyama; 3. Suvanto Aleksi, Koyama; 3. Kolehmainen Tauno, Helsingin JS

Women over 78 kg
1. Marttinen Satu, Tampereen Judo; 2. Savolainen Pirjo, Espoon JK
```

### 5.3 Category label construction

The label is built from the competition's category definitions:
- Category name (English or Finnish depending on active UI language) + weight class
- Weight rendered as "under X kg" / "over X kg" (English) or "alle X kg" / "yli X kg" (Finnish)
- Category ordering follows the order in `results.json` — no sorting is applied

### 5.4 Data source

Read from `results.json` in the competition's SFTP directory. If the file does not exist, the response is empty.

---

## 6. SuomiSport Integration — Technical Details

### 6.1 Authentication

OAuth2 client credentials flow. Token endpoint: `https://www.suomisport.fi/oauth2/token`. API base: `https://www.suomisport.fi/api/public/v2`. Credentials stored as an environment variable (`SUOMISPORT_TOKEN`).

### 6.2 Sync behaviour

- Runs as a background job (task queue)
- Can be manually triggered by an admin from the UI; progress is visible in real time
- Populates the three cache tables: `suomisport_licence`, `suomisport_merit`, `suomisport_granted_merit` (see §1.12)
- Users who have the GDPR no-sync flag set are skipped

### 6.3 License validation during competitor registration

When a competitor is registered, the system looks up matching records in `suomisport_licence` by first name, last name, and club. A match is valid if the competition's start date falls within the license's start–end date range. Mismatches on name or birth year are flagged separately from the license validity flag.

---

## 7. SFTP User Management

### 7.1 Username conventions

Each competition gets two Linux system accounts:
- **Results operator:** `r{competition_id}` (e.g. `r42`)
- **Video operator:** `v{competition_id}` (e.g. `v42`)

### 7.2 Access restrictions

- Both account types are chrooted to their competition's directory — they cannot navigate outside it
- SSH public key authentication only; password authentication is disabled
- No interactive shell access

### 7.3 SSH key lifecycle

- An Ed25519 keypair is generated per competition on demand
- The private key is downloadable by admins and handed to the operator
- Public key is installed into the Linux user's `authorized_keys`
- Provisioning and deprovisioning are handled by a server-side shell script

---

## 8. StarttiCup Eligibility — Win Count Detail

A competitor is flagged as ineligible if their win count from the match history database exceeds 5.

**Query logic (pseudocode):**
```
wins = count of distinct matches where:
  (competitor is search1 AND points1 > 0)
  OR (competitor is search2 AND points2 > 0)
  AND competition name NOT LIKE 'Startti%'
  AND competition name NOT LIKE 'Junnu%'
  AND competition name NOT LIKE '%salikisa%'
```

- Competitor is identified by a normalised `firstname_lastname` search key
- Only applied to Finnish competitors (country = `FIN`); foreign competitors bypass the check
- The flag is a warning only — it does not hard-block registration
