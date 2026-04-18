# JudoKisa

Mobile-first web platform for Finnish judo competitions — results, video feeds, and competitor history. Replaces [judokisa.fi](https://judokisa.fi).

See [`spec.md`](./spec.md) for the full application specification.

---

## Repository structure

```
/                   Next.js frontend (read-only, serves the public site)
scraper/            Node.js scraper (writes competition data to the database)
prisma/             Shared database schema (used by both frontend and scraper)
```

---

## Prerequisites

- Node.js 20+
- A PostgreSQL database — [Supabase](https://supabase.com) free tier is recommended

---

## Frontend

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your database connection string:

```
DATABASE_URL="postgresql://user:password@host:5432/judo?schema=public"
```

### 3. Set up the database

Apply all pending migrations to create or update the tables:

```bash
npx prisma migrate deploy
```

Use `migrate deploy` when targeting a remote database (Supabase, production). It applies the committed SQL files in `prisma/migrations/` without generating new ones.

### 4. Start development server

```bash
npm run dev
```

The site is available at [http://localhost:3000](http://localhost:3000). It redirects to `/fi` automatically.

### Other commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build + type check |
| `npm run lint` | ESLint |
| `npx prisma studio` | Browse the database in a GUI |
| `npx prisma migrate deploy` | Apply pending migrations to the database |
| `npx prisma generate` | Regenerate client after schema edits |

---

## Database migrations

The schema lives in `prisma/schema.prisma` and is shared by both the frontend and the scraper. Migration SQL files are committed to git under `prisma/migrations/`.

### Applying existing migrations (first-time setup or new environment)

```bash
npx prisma migrate deploy
npx prisma generate
```

### Making a schema change

1. Edit `prisma/schema.prisma`
2. Generate and apply a new migration:
   ```bash
   npx prisma migrate dev --name describe_your_change
   ```
3. Regenerate the TypeScript client:
   ```bash
   npx prisma generate
   ```
4. Commit both the updated `schema.prisma` and the new file in `prisma/migrations/`

> **`migrate dev` vs `migrate deploy`** — `migrate dev` diffs your schema, generates a new SQL migration file, and applies it immediately. Use it locally. `migrate deploy` only applies already-committed migration files without generating anything — use it for Supabase and production deployments.

> **Supabase note** — use the **Session mode pooler** connection string (port 5432 on `aws-0-*.pooler.supabase.com`), not the direct `db.*.supabase.co` host. New Supabase projects are IPv6-only on the direct connection, which most home networks cannot reach.

---

## Scraper

The scraper fetches competition data from [judokisa.fi](https://judokisa.fi) and writes it to the shared PostgreSQL database. It must point at the **same** `DATABASE_URL` as the frontend.

### 1. Install

```bash
cd scraper
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `scraper/.env` and set the same `DATABASE_URL` as the frontend.

### 3. Generate Prisma client

The scraper shares the schema from the root `prisma/` directory. Generate the client once after installation (and after any schema changes):

```bash
cd scraper
npx prisma generate
```

### 4. Run

```bash
# Live run — scrapes judokisa.fi and writes to the database
npm run scrape

# Dry run — scrapes and prints what would be written, no DB changes
npm run scrape:dry
```

### What the scraper does

On each run it:

1. Fetches the full competition list from [judokisa.fi](https://judokisa.fi)
2. For each competition, fetches the detail page (info, video link)
3. For completed competitions, fetches the results page and upserts all placements
4. Creates or updates each competition record in the database

Run it on a schedule (e.g. daily via cron) to keep the site up to date:

```cron
# Run every day at 06:00
0 6 * * * cd /path/to/judo/scraper && npm run scrape >> /var/log/judokisa-scraper.log 2>&1
```

### Tuning

| Env variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string (required) |
| `DRY_RUN` | `false` | Set to `true` to skip all DB writes |
| `REQUEST_DELAY_MS` | `1000` | Delay between HTTP requests (ms) — be polite to judokisa.fi |
