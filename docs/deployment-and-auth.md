# Deployment & Authentication — Implementation Specification

**Version:** 0.1.0
**Status:** Draft — not yet implemented
**Last updated:** 2026-05-16

> **How to read this document.** This is a focused implementation spec covering two coupled topics: the **real authentication layer** that replaces the mock-auth scaffold described in `spec.md` §8.1, and the **deployment setup** for hosting the Next.js app on Vercel against the existing Supabase database. The two are sequenced together because the admin surface (the long-term data ingestion path — `spec.md` §8.11) cannot be exposed publicly without real auth, and admin must work in production once the scraper is deprecated (`spec.md` §2). Decisions made here are proposed for inclusion in the main `spec.md` Decision Log as **D26–D29**.

---

## 1. Context & Motivation

The codebase is read-only safe today — public competition pages are gated by RLS and require no login. The blockers for going public are all on the write/admin side:

1. The Prisma connection uses the Supabase `postgres` superuser, which carries `BYPASSRLS`. The RLS policies added in migration `20260516120000_add_row_level_security` are present but **not enforced** at runtime.
2. `src/app/[locale]/admin/layout.tsx` explicitly documents that it performs no role enforcement. Any visitor who navigates to `/admin` can reach every admin page.
3. Server actions in `src/app/[locale]/admin/*/actions.ts` perform DB writes with no caller check. Server Actions are HTTP-callable endpoints; route obscurity is not protection.
4. The mock session (`src/lib/session.ts`, `mockUserId` cookie, `/login` user-picker) is an interim dev scaffold that must not ship publicly.

The scraper is being deprecated (`spec.md` §2), so admin **is** the production data ingestion path. Auth therefore has to land before public deploy.

## 2. Scope

**In scope:**
- Replacing the mock-auth scaffold with a real, production authentication layer.
- Switching the database connection off the `postgres` superuser so the existing RLS policies are enforced.
- RLS policy completion for the three tables currently lacking policies (`User`, `UserProfile`, `CompetitionRefereeInvitation`).
- Vercel as the deployment target, with environment configuration and security headers.

**Out of scope (deferred to later specs):**
- Social authentication providers (`spec.md` §9.4 lists Google/Facebook/GitHub/LinkedIn/Twitter as planned; first cut ships with email/password + magic link only).
- Object storage signed URLs (`spec.md` §9.5 — D23 unresolved).
- SFTP ingest user provisioning (`spec.md` §8.7).
- Preview-deploy database isolation (Supabase branching, paid feature).

## 3. Architecture Decisions

### D26 — Authentication technology: Supabase Auth

**Decision:** Use Supabase Auth as the identity provider, accessed via `@supabase/ssr` for Next.js App Router server/client integration.

**Rationale:**
- Already on Supabase — no new vendor, no new free-tier ceiling. Supabase Auth covers 50k MAU on the free plan.
- The only option that lets `auth.uid()` work natively inside the existing RLS policies. Every alternative (Auth.js, Clerk, Lucia) means running a second identity system and bridging session state back into Postgres manually.
- `@supabase/ssr` provides the standard cookie + session-refresh handling for the App Router.
- Supports the planned migration path to social providers (`spec.md` §9.4) without re-platforming.

**Alternatives considered:**
- **Auth.js (NextAuth)** — flexible but requires a separate session-to-Postgres bridge for RLS. Adds maintenance for no gain here.
- **Clerk** — strong DX but $25/mo after 10k MAU and still requires bridging to Supabase for RLS.
- **Lucia / roll-your-own** — reimplements work Supabase already does correctly.

### D27 — Identity / data hybrid: Supabase Auth + Prisma

**Decision:** Keep Prisma for application queries; use Supabase Auth purely for identity. Link the app's `User.id` to `auth.users.id` via foreign key.

**Rationale:**
- The codebase is built around Prisma; the schema is in `prisma/schema.prisma`; migrations live in `prisma/migrations/`. Replacing Prisma with `supabase-js` queries would be a much larger refactor than the auth change itself.
- The hybrid pattern is well-trodden: Supabase Auth owns the `auth.users` row and the JWT/cookie; Prisma queries run as a least-privileged Postgres role; the request's `auth.uid()` is propagated to RLS via `SET LOCAL` on the connection.

### D28 — Database role: dedicated least-privileged app role

**Decision:** Create a new Postgres role (e.g. `app_user`) that does **not** have `BYPASSRLS`. Grant it the table privileges it needs on the `public` schema. Point `DATABASE_URL` at this role's credentials.

**Rationale:** Existing RLS policies (`20260516120000_add_row_level_security`) take effect immediately once the connection no longer bypasses them. No new policies are required to start enforcing the public-read / private-block split that's already in place.

### D29 — Hosting target: Vercel

**Decision:** Deploy the Next.js frontend to Vercel. Start on the Hobby tier (free) for the non-profit launch; upgrade to Pro ($20/mo) only when MAU/bandwidth limits warrant it.

**Rationale:**
- Already named as the host in `spec.md` §2.
- Native Next.js support; zero-config auto-scaling; preview deploys per PR; edge CDN.
- For the projected scale (a few thousand total users, dozens concurrent), free-tier headroom is large.
- Escape hatch is cheap: adding `output: 'standalone'` to `next.config.ts` keeps the option of containerizing for Fly.io / Railway open without rework.

**Alternatives considered:** Cloudflare Pages (Prisma + pg adapter on Workers adds complexity), Netlify (Next.js support lags), Fly.io/Railway/Render (no true free tier; useful as future escape hatch but not as starting point).

---

## 4. Phase 1 — Authentication

### 4.1 Database role split

1. In Supabase SQL editor, create a new role `app_user` with `LOGIN`, **without** `BYPASSRLS` and **without** `SUPERUSER`.
2. Grant the minimum privileges:
   - `GRANT USAGE ON SCHEMA public TO app_user`
   - `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user`
   - `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user`
   - `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user`
3. Rotate the password and store it in `DATABASE_URL` locally and in Vercel env.
4. Keep the `postgres` role credentials available only for migrations (`DIRECT_URL`), never in the running app.

### 4.2 Supabase Auth integration

1. Enable Email provider in Supabase Auth → Providers. Disable confirm-email-on-signup for the first cut; enable later when SMTP is wired (per `spec.md` §9.3).
2. Install: `npm i @supabase/supabase-js @supabase/ssr`.
3. Add env vars to `.env.local` and Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — used **only** in narrow admin server actions (e.g. inviting a referee creates an `auth.users` row). Document each call site; never expose to the client bundle.
4. Create the standard Supabase client helpers per `@supabase/ssr` docs:
   - `src/lib/supabase/server.ts` — cookie-aware server client (for RSC + server actions)
   - `src/lib/supabase/client.ts` — browser client
   - `src/lib/supabase/middleware.ts` — refresh helper, called from `src/proxy.ts`

### 4.3 User model linkage

1. Migration `20260517000000_link_users_to_supabase_auth` (illustrative name):
   - Add `User.id` foreign key to `auth.users.id` (`ON DELETE CASCADE`).
   - Backfill existing `User` rows: for each, create a corresponding `auth.users` row (with a placeholder unconfirmed email if needed) so existing referees/admins can be migrated, or mark them inactive pending re-invitation.
   - Drop any password field if one exists on `User` (Supabase Auth owns credentials).
2. The role flags on `UserProfile` (`isAdministrator`, `isCommission`, …) remain the authoritative source of truth for in-app permissions; Supabase Auth only confirms identity.

### 4.4 Session handling

1. Replace `src/lib/session.ts`:
   - `getCurrentUser()` reads the Supabase session via the server client, looks up the linked `User` (+ `UserProfile`) by `auth.users.id`, returns it or `null`.
   - `requireCurrentUser()` redirects to `/login` when unauthenticated; otherwise returns the user.
   - Add `requireAdmin()` helper that calls `requireCurrentUser()` and additionally checks that `UserProfile` has **at least one** of the admin-relevant role flags listed in `spec.md` §6.7.
2. Update `src/proxy.ts` to call the Supabase middleware refresh helper so session cookies stay fresh across requests.
3. RLS-aware queries: before any Prisma query that depends on `auth.uid()`, call `SET LOCAL` on the connection to propagate the JWT claims. Encapsulate in a helper around the Prisma client (e.g. `withAuth(prisma, userId)`).

### 4.5 Authentication routes

1. Build out the planned routes from `spec.md` §6.2:
   - `/auth/login` — email + password form; also a "send me a magic link" option.
   - `/auth/register` — **open self-signup** (email + password + first/last name). The server action calls `supabase.auth.signUp(...)` and, in the same request, creates the linked `User` row with `authUserId` populated plus an empty `UserProfile`. Pre-checks for an existing `User` with the same email so a duplicate signup can't strand an orphan `auth.users` row.
   - `/auth/reset-password` — request reset email; consume reset token.
   - `/auth/callback/[provider]` — placeholder for D26's deferred social providers; can be stubbed.
2. Remove the existing mock-auth `/login` page and `loginAs` / `logout` server actions.
3. Display server-side error messages from Supabase Auth responses; use existing `next-intl` keys for translations.

**Email confirmation toggle.** Supabase Auth defaults to requiring a confirmation link before the new account can sign in. Keep this on for v1 — it deters spam signups and gives a free unique-email guarantee. If onboarding friction proves high in practice, the setting can be flipped off in Supabase project settings without code changes; the success message in `SignUpForm` already reads as a "check your inbox" prompt either way.

### 4.6 Admin / role enforcement

1. `src/app/[locale]/admin/layout.tsx`:
   - Remove the "No role enforcement in this implementation wave" comment.
   - Call `requireAdmin()` at the top; redirect non-admins to `/profile`.
   - Filter the subnav by the user's specific role flags (`spec.md` §6.7).
2. Every server action under `src/app/[locale]/admin/*/actions.ts`:
   - Call `requireAdmin()` (or a more specific role check, e.g. `requireCompetitionManager()`) at the very top.
   - Do **not** rely on the layout check alone — server actions are independently HTTP-callable.
3. Add input validation with `zod` schemas, replacing the hand-rolled enum/string parsing currently in the actions.

### 4.7 RLS policies for currently-unprotected tables

The migration `20260516120000_add_row_level_security` left `User`, `UserProfile`, and `CompetitionRefereeInvitation` with RLS enabled but **no policies**, blocking all access. Add policies in a follow-up migration:

| Table | Read | Write |
|---|---|---|
| `User` | Self (`auth.uid() = id`); admins via role check | Self for whitelisted profile fields (already enforced at server-action layer per `spec.md` §8.1); admins for all |
| `UserProfile` | Self; admins | Self for whitelisted fields; admins for all |
| `CompetitionRefereeInvitation` | Self (referee), competition manager of the linked competition, admins | Competition manager, admins |

Define a SQL function `is_admin(uid uuid)` that reads the role flags off `UserProfile` and reuse it in policies.

### 4.8 Security hygiene

These are not architectural decisions, but should land alongside Phase 1.

1. Pin TLS: append `&sslmode=require` to `DATABASE_URL`.
2. Add security headers in `next.config.ts`:
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-Content-Type-Options: nosniff`
   - Minimal `Content-Security-Policy` allowing self + Supabase + Vimeo (for video feeds, `spec.md` §5.9).
3. Rate limit `/auth/login`, `/auth/reset-password`, and **`/auth/register`** using `@upstash/ratelimit` + Upstash Redis (free tier). Supabase has its own throttle on the auth endpoints, but adding an app-side limit is cheap and gives us per-IP / per-email control before requests even reach Supabase. Suggested defaults: 5 login attempts / 15 min / IP; 3 signups / hour / IP; 3 reset requests / hour / email.
4. Rotate the Supabase DB password before first public deploy — it has lived in local `.env` files.

### 4.9 Account-claim flow for admin-created users

**Problem.** When an admin creates a user via `/admin/users/new` (referee onboarding, importing a roster), the resulting `User` row has `authUserId = null` — there's no auth.users row yet, so the user cannot sign in. Today these accounts are indistinguishable in shape from dependent-only accounts (see `docs/guardianship.md` §4.2), which is intentional, but it leaves a gap: an admin-onboarded referee has no way to claim their login.

**Solution.** Allow the signup flow to *link* an existing `User` row instead of always creating a new one when the email matches.

Behaviour:
1. User visits `/auth/register` and submits with email `referee@example.com`.
2. Server action looks up `User` by that email.
3. **If found AND `authUserId IS NULL`**: this is an admin-created shell. Proceed:
   - Call `supabase.auth.signUp(...)` as usual; auth.users row is created.
   - Update the existing `User` row: set `authUserId` to the new `auth.users.id`, keep firstName/lastName from the existing record (since the admin probably typed them correctly), and merge any provided values only into empty fields.
   - The empty `UserProfile` may already exist; upsert if not.
4. **If found AND `authUserId IS NOT NULL`**: reject — they should sign in or reset their password, not re-register. (Current behaviour.)
5. **If not found**: open-signup path — create both `User` and `UserProfile`. (Current behaviour.)

Edge cases:
- **Email confirmation still applies** to the new `auth.users` row even when linking. The User row is updated optimistically; if the user never confirms, `authUserId` points at an unconfirmed Supabase user. That's fine — they just can't sign in until they confirm.
- **Conflicting names.** Don't silently overwrite `firstName`/`lastName` from the form. Prefer the admin-entered values unless the existing row's name fields are empty.
- **Roles and admin-set flags.** All `UserProfile` flags (`isReferee`, `isAdministrator`, etc.), `clubId`, `judoGrade`, etc. stay exactly as the admin set them. Signup only links identity, not profile data.

Implementation notes:
- Lives in `src/app/[locale]/auth/register/actions.ts`. Today that file rejects when a matching email is found; replace the reject branch with the linking logic above.
- The two-step write (Supabase signUp + Prisma update) is not transactional. If the Prisma update fails after signUp succeeded, the auth.users row remains and the User row stays `authUserId = null` — admin can re-run a backfill matching by email to repair. Surface the error to the user.

### 4.10 (Resolved) Self-signup is implemented

Per the decision recorded in §4.5, open email/password self-signup is the chosen path for v1; the original "invite-only first cut" alternative is dropped. Admin onboarding remains supported through `/admin/users/new`, with the account-claim flow above bridging admin-created shells to logins when the user is ready.

---

## 5. Phase 2 — Deployment (Vercel)

### 5.1 Supabase configuration

1. Database → Connection pooling: confirm **Transaction** mode pooler is enabled.
2. `DATABASE_URL` for Vercel (note: `app_user`, not `postgres`):
   ```
   postgresql://app_user.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```
3. Auth → URL Configuration:
   - Site URL: production domain (or initial `*.vercel.app`).
   - Additional Redirect URLs: `https://*.vercel.app/**` to allow preview deploys to complete login redirects.
4. Backups: confirm daily backups enabled (free-tier default, 7-day retention). Plan for PITR ($25/mo) if/when going to Pro.

### 5.2 Vercel project setup

1. Import the GitHub repo in the Vercel dashboard (no `vercel.json` needed; Next.js auto-detected).
2. Environment variables, scoped to **Production** and **Preview**:
   - `DATABASE_URL` — `app_user` pooler URL with `sslmode=require`.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — only if confirmed needed by admin server actions; otherwise omit.
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — if rate limiting is wired.
3. Set Production Branch = `main`. PRs auto-deploy as Preview environments with isolated URLs.
4. Add the production custom domain when ready (defer until launch).

### 5.3 Next.js config

1. Add `output: 'standalone'` to `next.config.ts` — costs nothing on Vercel; preserves the option to containerize later.
2. Add the security headers from §4.8.

---

## 6. Concrete Implementation Checklist

Tasks are grouped by phase; each is intended to be a small, reviewable change.

### Phase 1A — DB role & RLS enforcement
- [ ] T1. In Supabase SQL editor, create `app_user` role with the privileges listed in §4.1.
- [ ] T2. Update local `.env` / `.env.local` to use `app_user` credentials.
- [ ] T3. Run the app locally and verify: `Competition` queries work, `User` queries return 0 rows from an unauthenticated context. Document the smoke-test in `docs/`.
- [ ] T4. Rotate the `postgres` password (since `app_user` is now in use, the old shared password should be retired).

### Phase 1B — Supabase Auth wiring
- [ ] T5. `npm i @supabase/supabase-js @supabase/ssr`.
- [ ] T6. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` and `.env.example`.
- [ ] T7. Create `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts` per `@supabase/ssr` docs.
- [ ] T8. Update `src/proxy.ts` to invoke the Supabase middleware refresh helper alongside the existing `next-intl` proxy.

### Phase 1C — User model migration
- [ ] T9. Write Prisma migration linking `User.id` → `auth.users.id` (FK, `ON DELETE CASCADE`).
- [ ] T10. Backfill script: for each existing `User`, create a corresponding `auth.users` entry (or mark inactive). Idempotent; runnable from `scripts/`.
- [ ] T11. Drop any password field from `User` if present.

### Phase 1D — Session helpers & auth routes
- [ ] T12. Replace `src/lib/session.ts`: new `getCurrentUser` reads Supabase session; add `requireAdmin` helper.
- [ ] T13. Add `withAuth(prisma, userId)` helper that issues `SET LOCAL "request.jwt.claims"` before queries that depend on `auth.uid()`.
- [ ] T14. Implement `/auth/login` with email/password + magic link.
- [ ] T15. Implement `/auth/register` (open self-signup; email + password + first/last name; creates `auth.users` + linked `User` + empty `UserProfile`; rejects on existing-with-authUserId email).
- [ ] T15a. Account-claim flow (§4.9): when signup email matches an existing `User` with `authUserId IS NULL`, link the rows instead of rejecting.
- [ ] T16. Implement `/auth/reset-password` (request + consume token).
- [ ] T17. Stub `/auth/callback/[provider]` for future social providers.
- [ ] T18. Delete the mock `/login` page and `loginAs` / `logout` server actions.

### Phase 1E — Admin & server action gating
- [ ] T19. Add `requireAdmin()` call to `src/app/[locale]/admin/layout.tsx`; remove the disclaimer comment; filter subnav by role flags.
- [ ] T20. Add role checks to every server action file under `src/app/[locale]/admin/*/actions.ts`.
- [ ] T21. Add `zod` validation schemas for each server action payload.

### Phase 1F — RLS policy completion
- [ ] T22. New migration: SQL function `is_admin(uid uuid)` reading role flags from `UserProfile`.
- [ ] T23. Same migration: policies for `User`, `UserProfile`, `CompetitionRefereeInvitation` per the table in §4.7.

### Phase 1G — Security hygiene
- [ ] T24. Append `&sslmode=require` to `DATABASE_URL` (local + Vercel).
- [ ] T25. Add security headers in `next.config.ts` per §4.8.
- [ ] T26. Wire `@upstash/ratelimit` on `/auth/login`, `/auth/reset-password`, and `/auth/register`.

### Phase 2 — Deployment
- [ ] T27. Confirm Supabase transaction-mode pooler is enabled.
- [ ] T28. Configure Supabase Auth URL Configuration with production domain and `*.vercel.app` wildcard.
- [ ] T29. Add `output: 'standalone'` to `next.config.ts`.
- [ ] T30. Import the GitHub repo into Vercel; configure env vars (§5.2).
- [ ] T31. Set Production Branch = `main`.
- [ ] T32. Push a PR; confirm Preview deploy works end-to-end including login.
- [ ] T33. Promote to Production; smoke-test from a fresh browser session.

---

## 7. Verification

Run before flipping the site to a custom domain or announcing publicly.

**Phase 1 acceptance:**
1. Connect to the DB as `app_user` directly: `SELECT * FROM "User"` returns 0 rows; `SELECT * FROM "Competition"` returns rows.
2. Visit `/admin` while logged out → redirect to `/auth/login`.
3. Log in as a non-admin user → visit `/admin` → redirect to `/profile`.
4. Log in as an admin user → `/admin` loads; subnav shows only the sections matching that user's role flags.
5. With a valid admin session cookie, `curl` a server action endpoint directly → succeeds. Remove the cookie → rejected with an auth error, not a silent insert.
6. Email/password signup + login round-trip works; magic-link round-trip works.
7. Password reset round-trip works.
8. RLS smoke test: while authenticated as user A, attempt to read user B's `UserProfile` row → blocked.

**Phase 2 acceptance:**
9. `npm run dev` locally with all new env vars → all routes render; login works.
10. Push a branch → Vercel Preview builds; preview URL renders public pages and login works against Supabase.
11. Merge to `main` → Production deploy live at the Vercel-assigned URL.
12. Production smoke test: `/fi`, `/fi/competitions`, a detail page, `/auth/login`, `/admin` (logged in). No connection-pool errors. Vercel logs show p50 < 500ms for SSR pages.

---

## 8. Open Questions

These don't block the spec but should be resolved before or during implementation:

1. ~~**Self-signup vs. invite-only.**~~ **Resolved (§4.10):** open self-signup at `/auth/register`. Admin onboarding continues to work for shells, bridged by the account-claim flow (§4.9).
2. **Email confirmation default.** Supabase Auth defaults to requiring email confirmation before the first sign-in. v1 plan is to keep it on (free spam deterrent + unique-email guarantee), and onboarding friction is acceptable for a federation site. Confirm before going public — if friction is unacceptable, flip it off in Supabase project settings (no code change). Re-evaluate once we have signup conversion numbers.
3. **Backfill strategy.** Migrating existing `User` rows into `auth.users` — should existing referees/admins be auto-issued password-reset emails, or relinked via the §4.9 account-claim flow on their first signup attempt? Recommended: account-claim flow, since it's already on the path and avoids sending mass emails before the auth backend is proven.
4. **Service role usage.** Decide which admin server actions (if any) legitimately need `SUPABASE_SERVICE_ROLE_KEY`. Default: none; document every exception.
5. **Email provider.** Supabase's built-in SMTP is rate-limited (3–4 emails/hour on free tier). Production needs a real SMTP provider (`spec.md` §9.3) — decide between Resend, Postmark, AWS SES. **Required before public launch** because the confirmation-email throughput on Supabase's default SMTP will not survive any meaningful signup volume.
6. **Custom domain timing.** Acquire the production domain before or after first deploy? Affects Supabase Auth URL config.
7. **Signup rate-limit thresholds.** §4.8 proposes 3 signups / hour / IP. Confirm this is high enough to absorb shared-NAT family signups (e.g. multiple siblings at the same home network creating accounts in succession) and low enough to deter signup spam.
