# Guardian / Dependent Profile Management — Implementation Specification

**Version:** 0.1.0
**Status:** Draft — not yet implemented
**Last updated:** 2026-05-16

> **How to read this document.** This is a focused implementation spec for the parent/guardian feature: any authenticated user can create, edit, and soft-delete their own children's profiles, register them for competitions, and view their full history — all without admin involvement. Admins act as supplementary overrides (linking additional guardians, restoring revoked accounts, etc.). The spec extends `docs/spec.md` (§3 roles, §5.10 User/UserProfile, §6.2 routes, §8.1 auth, §8.2 registration) and **amends** `docs/deployment-and-auth.md` (D27, §4.7, §4.8); the amendments are listed in §9. Decisions made here are proposed for the main `spec.md` Decision Log as **D30–D33**.

---

## 1. Context & Motivation

Adult guardians need to manage minor children's data in the same way they manage their own: see the same profile fields, view results / matches / referee jobs / registrations, edit profile data, register the child for competitions. The same applies to several legitimate variants — divorced parents (multiple guardians per child), a single parent with multiple judoka children, a legal guardian who is not a parent, and occasionally a coach acting as an OTHER-relation guardian.

**Two design goals shape this spec:**

1. **Parents are the primary actor.** The day-to-day lifecycle (create child account, edit, soft-delete, register for competitions) is fully self-service. Admins are involved only for edge cases (adding a second guardian to an existing dependent, restoring a revoked relationship, reactivating a soft-deleted account).
2. **Asymmetry of access.** A guardian can act on a dependent's behalf; a dependent cannot reach back into a guardian's profile. When the child eventually claims their own login, they manage their own data going forward, and the parent's read/write access can continue (or be revoked through the soft-delete flow).

This spec must be implemented **after / alongside** the auth work in `docs/deployment-and-auth.md` — it amends decision D27 in that spec so that dependent-only users (children with no login of their own) can exist before they have an `auth.users` row.

## 2. Scope

**In scope:**
- Schema for guardian↔dependent relationships, supporting many-to-many.
- Parent self-service lifecycle: create, update, soft-delete, restore dependent accounts.
- Authorization helpers and RLS so a guardian can act on a dependent's behalf wherever they could act on their own behalf.
- Parent-side UI: Family panel on `/profile`, dedicated `/profile/dependents/[id]/*` route tree, create-child form.
- Competition registration: parent-as-registrant flow that finally populates the `Competitor.athleteId` / `Competitor.registeredById` FKs (added per D24 but never set).
- Admin UI: guardianship section embedded in `/admin/users/[id]` for overrides and audit.

**Out of scope (deferred):**
- Self-claim flow where a dependent-only account upgrades to a full login when the child reaches the age of digital consent (sketched in §10).
- Cross-parent invitation flow (parent A invites parent B to also guardian child C). v1 limit: a parent can only create *new* dependents; adding a second guardian to an existing dependent requires admin. Guardrail against fraudulent "this child is mine" claims.
- SuomiSport sync for dependent-only users (governed by existing `gdprNoSync` and the lack of `suomiSportPersonId`).
- TeamEntry / kata-pair guardian consent handling (TeamEntry not yet in schema — D19 deferred).

## 3. Architecture Decisions

### D30 — Many-to-many guardianship via explicit join model

**Decision:** Add a `Guardianship` model with composite PK `(guardianId, dependentId)`, status enum, audit columns (`createdAt/createdById/revokedAt/revokedById`), and a `relation` enum (PARENT / LEGAL_GUARDIAN / OTHER). Follows the existing `CompetitionRefereeInvitation` pattern.

**Rationale:** Supports multiple guardians per child (divorced parents) and multiple children per guardian (siblings). The audit trail distinguishes parent-initiated vs admin-initiated actions, which is necessary for reconciling disputes.

### D31 — Dependent-only accounts (amends D27)

**Decision:** `User` has an optional `authUserId String? @unique` FK to `auth.users.id` and an optional `email String?`. A dependent-only user has both null. When the child claims their own login (future), `authUserId` is populated and `email` set.

**Rationale:** Children below the age of digital consent cannot have their own `auth.users` row, but they still need `User` rows so they can be the `athleteId` on `Competitor`/`Result`/`Match` (per D24). Decoupling `User.id` from `auth.users.id` keeps the future self-claim path simple.

**Amends:** D27 in `docs/deployment-and-auth.md`, which originally required `User.id == auth.users.id`.

### D32 — Parent self-service is the primary lifecycle path

**Decision:** Any authenticated user can create, update, and soft-delete their own dependents through `/profile/dependents/*` server actions, without admin involvement. Admin actions exist as supplementary overrides on `/admin/users/[id]`.

**Rationale:** The federation should not be a bottleneck for routine family operations. Admin involvement is reserved for adversarial or unusual cases (adding a second guardian, restoring deleted accounts, reactivating users).

### D33 — Soft-delete semantics: revoke guardianship + conditional deactivate

**Decision:** "Remove from my family" (parent action) revokes the calling user's own `Guardianship` row (status → REVOKED, audit fields populated). If that was the last `ACTIVE` Guardianship for the dependent, `UserProfile.active` is set to false as a side effect. The action is reversible by the same parent (via Restore button) as long as no other guardian has been added in the interim; otherwise admin must restore.

**Rationale:** Preserves historical lineage (results, matches, registrations stay intact via D24's `athleteId` FKs). Distinguishes the relationship lifecycle (Guardianship status) from the account lifecycle (UserProfile.active). Cannot soft-delete a child who has claimed their own login — they must consent or admin must intervene.

---

## 4. Schema Changes

### 4.1 New `Guardianship` model

```prisma
enum GuardianshipRelation {
  PARENT
  LEGAL_GUARDIAN
  OTHER
}

enum GuardianshipStatus {
  ACTIVE
  REVOKED
}

model Guardianship {
  guardianId   String
  dependentId  String
  relation     GuardianshipRelation @default(PARENT)
  status       GuardianshipStatus   @default(ACTIVE)
  createdAt    DateTime  @default(now())
  createdById  String?              // parent themselves (self-service) or admin
  revokedAt    DateTime?
  revokedById  String?              // parent themselves or admin

  guardian     User @relation("GuardianRelations",  fields: [guardianId],  references: [id], onDelete: Cascade)
  dependent    User @relation("DependentRelations", fields: [dependentId], references: [id], onDelete: Cascade)
  createdBy    User? @relation("GuardianshipCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  revokedBy    User? @relation("GuardianshipRevokedBy", fields: [revokedById], references: [id], onDelete: SetNull)

  @@id([guardianId, dependentId])
  @@index([guardianId])
  @@index([dependentId])
  @@index([status])
}
```

Back-relations on `User`:
```prisma
guardianFor          Guardianship[] @relation("GuardianRelations")
guardedBy            Guardianship[] @relation("DependentRelations")
createdGuardianships Guardianship[] @relation("GuardianshipCreatedBy")
revokedGuardianships Guardianship[] @relation("GuardianshipRevokedBy")
```

**Constraints:**
- DB-level CHECK: `guardianId <> dependentId` (no self-guardianship).
- Application-level: prevent two-step and longer cycles at write time (the graph is small; a depth-limited walk is fine).

### 4.2 `User` table changes (per D31)

```prisma
model User {
  id          String  @id @default(cuid())
  authUserId  String? @unique   // FK → auth.users.id; null for dependent-only
  email       String? @unique   // optional; null until login claimed
  // ... existing fields ...
}
```

All session-to-user lookups go via `authUserId`, not `id`.

### 4.3 Migration order

1. `<ts>_user_auth_user_id_optional` — add `authUserId String? @unique`, make `email` optional. Backfill `authUserId` for existing users with corresponding `auth.users` rows (run after the Phase 1 auth migration that created those rows — see `deployment-and-auth.md` §4.3).
2. `<ts>_add_guardianship` — create the `Guardianship` model + indexes + CHECK constraint via raw SQL in the migration.

---

## 5. Business Logic

### 5.1 Authorization helpers — `src/lib/guardianship.ts` (new)

- `getDependents(guardianUserId): Promise<User[]>` — active dependents via `Guardianship.status = ACTIVE`.
- `getGuardians(dependentUserId): Promise<User[]>` — used in the dependent's own profile to show "Managed by".
- `canActAs(currentUserId, targetUserId): Promise<boolean>` — true if same user, or active Guardianship exists. One indexed query.
- `requireCanActAs(currentUserId, targetUserId): Promise<void>` — throws/redirects if not.

### 5.2 SQL helper for RLS

```sql
CREATE OR REPLACE FUNCTION is_guardian_of(guardian uuid, dependent uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Guardianship"
    WHERE "guardianId"  = guardian::text
      AND "dependentId" = dependent::text
      AND status = 'ACTIVE'
  );
$$;
```

Stable and indexed; fine to call per-row from policies.

### 5.3 "Act-as" context resolution — extend `src/lib/session.ts`

```ts
export async function requireTargetUser(targetUserId: string): Promise<User> {
  const me = await requireCurrentUser()
  await requireCanActAs(me.id, targetUserId)
  return prisma.user.findUniqueOrThrow({
    where: { id: targetUserId },
    include: { profile: true },
  })
}
```

All `/profile/dependents/[id]/*` pages and actions call `requireTargetUser(params.id)`. Everything downstream (`profileHistory.ts` helpers, edit form) takes `userId` as a parameter and works unchanged — `profileHistory.ts` is already fully parameterized.

### 5.4 Parent self-service server actions — `src/app/[locale]/profile/dependents/actions.ts` (new)

All actions call `requireCurrentUser()` and validate with `zod`.

**`createDependent(form)`** — any authenticated user can call. Single transaction:
1. Validate: `firstName`, `lastName` required; `dateOfBirth`, `gender`, `clubId`, `judoGrade`, `defaultCategoryCode`, `defaultWeightClass` optional; `relation` enum optional, defaults to `PARENT`.
2. Sanity check: reject if `firstName/lastName/dateOfBirth` matches an existing `User` row with non-null `authUserId` — that path requires the admin "link existing user" flow.
3. `prisma.user.create({ firstName, lastName, authUserId: null, email: null })`.
4. `prisma.userProfile.create({ userId, dateOfBirth, clubId, judoGrade, ..., active: true })`.
5. `prisma.guardianship.create({ guardianId: currentUser.id, dependentId: newUser.id, relation, status: ACTIVE, createdById: currentUser.id })`.
6. Revalidate `/profile`; return the new dependent's id (caller redirects to overview).

Rate-limited via `@upstash/ratelimit` (per `deployment-and-auth.md` §4.8): default **5 creations per hour per user**.

**`updateDependent(targetUserId, form)`** — calls `requireCanActAs(currentUser.id, targetUserId)`, then runs the same whitelist-field update that `profile/edit/actions.ts` does, parameterized by `targetUserId`. Whitelist: phone, dateOfBirth, address, clubId, geographicArea, judoGrade, profilePhoto, defaultCategoryCode, defaultWeightClass, gdprNoSync. Admin-only fields (role flags, license level, suomiSport IDs, active, blacklisted) remain admin-only.

**`softDeleteDependent(targetUserId)`** — calls `requireCanActAs(currentUser.id, targetUserId)`. Single transaction:
1. Confirm target is dependent-only (`authUserId IS NULL`). A parent cannot soft-delete a child who has claimed their own login.
2. Set caller's Guardianship row: `status = REVOKED`, `revokedAt = now()`, `revokedById = currentUser.id`.
3. If that was the last `ACTIVE` Guardianship for the dependent, set `UserProfile.active = false`.
4. Revalidate `/profile`.

**`restoreDependent(targetUserId)`** — parent or admin. Flips Guardianship row to `ACTIVE`; if the profile was deactivated as a side effect, re-activates it. The same parent may restore as long as no other guardian was added in the interim; otherwise admin path.

### 5.5 Competitor creation — populate the existing FKs (per D24)

`src/app/[locale]/admin/competitions/[id]/competitors/actions.ts` and the future public registration action (`spec.md` §8.2) must set:
- `athleteId` = competitor's `User.id` (the dependent, when registering a child).
- `registeredById` = current session user's `id`.

For free-text walk-in registrations (no `User` row for the athlete), `athleteId` stays null. `registeredById` is always set going forward.

### 5.6 Cycle and duplicate guardrails (server actions)

- Cannot create a Guardianship row with `guardianId = currentUser.id` AND `dependentId = currentUser.id` (also caught by the DB CHECK constraint).
- Cannot create a dependent whose graph would point back to `currentUser.id` (depth-limited walk on write).
- Re-creating an already-REVOKED row uses `restoreDependent`, not a fresh INSERT (composite PK would conflict anyway).

---

## 6. UI Changes

### 6.1 Family panel on `/profile`

`src/app/[locale]/profile/page.tsx` gains a section below the existing stat cards: **"My family" / "Perheeni"**.

- Lists every active dependent as a small card (photo, name, judo grade, club).
- Each card links to `/profile/dependents/[id]`.
- **"+ Add child"** button always visible, links to `/profile/dependents/new`.
- "Managed by" line if the current user is themselves a dependent of someone — informational only, no actions.

### 6.2 Dependent route tree — mirrors the existing profile tree

```
/[locale]/profile/dependents/new                       # Create form
/[locale]/profile/dependents/[id]/                     # Overview + Remove/Restore controls
/[locale]/profile/dependents/[id]/edit                 # Edit
/[locale]/profile/dependents/[id]/history              # Results
/[locale]/profile/dependents/[id]/history/matches
/[locale]/profile/dependents/[id]/history/referee      # Hidden if dependent has no referee role
/[locale]/profile/dependents/[id]/history/registrations
```

Reuses existing helpers (`profileHistory.ts`) and components (`ProfileSubNav`, `ProfileHistoryTabs`, `Badge`). A persistent header bar — "Viewing: <Child Name>" with a back link — keeps the user oriented.

Auth checks: every page calls `requireTargetUser(params.id)`; server actions do the same.

The overview page surfaces parent controls:
- **Remove from my family** (calls `softDeleteDependent`) — confirmation modal explains: revokes your guardianship; if you're the only guardian the account is also deactivated; admin can restore.
- **Restore** — visible if previously soft-deleted by this user and no other guardian has been added.

### 6.3 Create-child form — `/profile/dependents/new`

Intentionally short to lower friction:
- Required: first name, last name.
- Recommended: date of birth, gender, club (pre-filled from parent's club), judo grade.
- Optional: default category code, default weight class.
- Relation type: Parent / Legal guardian / Other (radio; defaults to Parent).
- No email field — dependent-only accounts have none.
- Submit → `createDependent` → redirect to the new dependent's overview.

### 6.4 Competition registration — self / dependent picker

The public registration page (`spec.md` §8.2, not yet built) gains a "Registering for" selector at the top when the current user has dependents:

```
○ Myself (<my name>)
○ Lapsi A (<grade>)
○ Lapsi B (<grade>)
```

Selecting a dependent pre-fills name, year-of-birth (from `UserProfile.dateOfBirth`), club, judo grade, default category/weight. Submit action sets `athleteId` and `registeredById` per §5.5.

For admin-side registration, add a similar "Pick existing user" path on `/admin/competitions/[id]/competitors/`. Free-text walk-in path stays. Sets `athleteId` (from picker) and `registeredById` (the admin doing the entry).

### 6.5 Admin guardianship management

Admin is **supplementary** to parent self-service.

**On `/admin/users/[id]`** — new "Guardian relationships" section with two tables:
- **Dependents of this user** — list + revoke button + audit trail (who created, who revoked, when).
- **Guardians of this user** — list + revoke button.
- "Link existing user as guardian" / "Link existing user as dependent" — opens a typeahead user-picker modal. Used for: adding a second guardian to an existing dependent, linking a coach as an OTHER-relation guardian, etc.
- "Restore" button on revoked rows.
- Separately on the user's main profile section: "Reactivate account" button when `UserProfile.active = false`.

**Optional v2:** `/admin/guardianships` global list for auditing; searchable by guardian or dependent. Skip in v1 if the per-user view is enough.

No new top-level entry in the admin subnav (`src/app/[locale]/admin/layout.tsx`).

### 6.6 i18n keys (fi + en)

- `profile.family.*` — title, empty_state_with_cta, add_child_button, viewing_as_banner, back_to_my_profile, managed_by
- `profile.dependents.create.*` — title, intro, first_name, last_name, dob, gender, club, judo_grade, relation, submit
- `profile.dependents.remove.*` — button label, confirm_dialog_title, confirm_dialog_body_sole_guardian, confirm_dialog_body_other_guardians_remain, restore_button
- `registration.registering_for.*` — picker label, options
- `admin.users.guardianships.*` — section title, columns, link/revoke/restore buttons, audit trail labels, picker modal labels

### 6.7 Components

Reuse existing primitives:
- Family panel cards: build on `CompetitionCard` / overview stat-card styling — no new shared component.
- New: `src/components/ActingAsBanner.tsx` — sticky strip at the top of the dependent layout.
- New: `src/components/UserPicker.tsx` — typeahead over `prisma.user.findMany`, used by admin section.

---

## 7. RLS Updates

The `app_user` role (per `deployment-and-auth.md` §4.1) needs guardian-aware policies. Helper used: `is_guardian_of(auth.uid(), <row-owner-uid>)` (§5.2).

| Table | Policy change |
|---|---|
| `User`         | SELECT: self **or** active guardian **or** admin. INSERT: authenticated users may insert rows with `authUserId IS NULL` (dependent-only); admin may insert anything. UPDATE: self **or** active guardian **or** admin (whitelist enforced at app layer). |
| `UserProfile`  | SELECT / UPDATE: same as `User`, keyed on `userId`. INSERT: paired with `User` insert. |
| `Competitor`   | SELECT: public (unchanged). INSERT / UPDATE: actor has `registeredById = self` AND (`athleteId IS NULL` OR `athleteId = self` OR `is_guardian_of(auth.uid(), athleteId)`); admin may write anything. |
| `Result`       | SELECT public (unchanged); writes admin-only. |
| `Match`        | SELECT public (unchanged); writes admin-only. |
| `Guardianship` | SELECT: admin, the guardian, or the dependent. INSERT: any authenticated user inserting a row where `guardianId = auth.uid()` AND the linked `dependentId.authUserId IS NULL`; admin may insert anything. UPDATE: the named guardian (to revoke their own row) or admin. |

RLS is defense in depth. App-layer `requireCurrentUser` / `requireCanActAs` checks plus server-action transactions are the primary gates.

---

## 8. Critical Files

**Schema:**
- `prisma/schema.prisma` — `Guardianship` model, `User.authUserId`, `User.email` optional
- `prisma/migrations/<ts>_user_auth_user_id_optional/migration.sql`
- `prisma/migrations/<ts>_add_guardianship/migration.sql`

**Business logic:**
- `src/lib/guardianship.ts` *(new)*
- `src/lib/session.ts` *(extend with `requireTargetUser`)*
- `src/lib/profileHistory.ts` *(no change — already `userId`-parameterized)*

**Parent-side UI:**
- `src/app/[locale]/profile/page.tsx` *(add Family panel + "+ Add child" CTA)*
- `src/app/[locale]/profile/dependents/actions.ts` *(new — create/update/softDelete/restore)*
- `src/app/[locale]/profile/dependents/new/page.tsx` *(new)*
- `src/app/[locale]/profile/dependents/[id]/page.tsx` *(new — overview + Remove/Restore)*
- `src/app/[locale]/profile/dependents/[id]/edit/page.tsx` *(new)*
- `src/app/[locale]/profile/dependents/[id]/history/{page,matches/page,referee/page,registrations/page}.tsx` *(new)*
- `src/app/[locale]/profile/dependents/[id]/layout.tsx` *(new — Viewing-as banner)*
- `src/components/ActingAsBanner.tsx` *(new)*

**Admin UI:**
- `src/app/[locale]/admin/users/[id]/page.tsx` *(add Guardianships section)*
- `src/app/[locale]/admin/users/[id]/actions.ts` *(add `adminLinkGuardianship`, `adminRevokeGuardianship`, `adminRestoreGuardianship`, `adminReactivateUser`)*
- `src/components/UserPicker.tsx` *(new)*
- *(optional v2)* `src/app/[locale]/admin/guardianships/page.tsx`

**Registration:**
- `src/app/[locale]/admin/competitions/[id]/competitors/{page,actions}.ts` *(add user-picker; set `athleteId` and `registeredById`)*
- Future public registration page (`spec.md` §8.2) — to ship with the "Registering for" picker from day one.

**i18n:**
- `src/messages/fi.json`, `src/messages/en.json` — keys per §6.6.

---

## 9. Amendments to `docs/deployment-and-auth.md`

These follow from the dependent-only-account requirement and the parent self-service flow. They should be folded into `deployment-and-auth.md` before implementation starts.

- **D27 (amend):** `User.authUserId String? @unique` instead of `User.id == auth.users.id`. `User.email` becomes optional. Dependent-only users have both null.
- **Phase 1C (T9 / T10 / T11):** rewrite to add `authUserId` as a nullable column; backfill populates `authUserId`, not `id`.
- **§4.7 RLS:** `User` / `UserProfile` policy becomes "self **or** active guardian **or** admin"; INSERT on `User` allows dependent-only creation.
- **§4.8 rate limiting:** add `createDependent` (default 5/hr/user) to the rate-limited actions list.
- **New Phase 1H:** the `Guardianship` migration, the `is_guardian_of` function, and the guardian-aware RLS policies.

---

## 10. Concrete Implementation Tasks

Grouped by sub-phase; each is intended to be a single reviewable PR.

### Phase G1 — Schema & helpers
- [ ] TG1. Migration: `User.authUserId String? @unique`, `email` optional.
- [ ] TG2. Migration: `Guardianship` model + indexes + DB CHECK constraint.
- [ ] TG3. SQL function `is_guardian_of(guardian uuid, dependent uuid)`.
- [ ] TG4. `src/lib/guardianship.ts` with `getDependents`, `getGuardians`, `canActAs`, `requireCanActAs` + unit tests.
- [ ] TG5. Extend `src/lib/session.ts` with `requireTargetUser`.

### Phase G2 — Parent self-service: create, update, soft-delete
- [ ] TG6. `createDependent`, `updateDependent`, `softDeleteDependent`, `restoreDependent` in `src/app/[locale]/profile/dependents/actions.ts` (zod validation, cycle/dup guardrails per §5.6, rate limit on `createDependent`).
- [ ] TG7. `/profile/dependents/new` create-child form (§6.3).
- [ ] TG8. `/profile/dependents/[id]/page.tsx` overview with Remove/Restore controls.
- [ ] TG9. `/profile/dependents/[id]/edit/page.tsx` edit form wired to `updateDependent`.

### Phase G3 — Family panel + history
- [ ] TG10. Family panel on `/profile/page.tsx` (list + "+ Add child" CTA + "Managed by" line).
- [ ] TG11. Four history pages under `/profile/dependents/[id]/history/*` reusing existing `profileHistory.ts` helpers.
- [ ] TG12. `src/components/ActingAsBanner.tsx` + `/profile/dependents/[id]/layout.tsx`.
- [ ] TG13. i18n keys (fi + en) per §6.6.

### Phase G4 — Admin guardianship overrides
- [ ] TG14. `adminLinkGuardianship`, `adminRevokeGuardianship`, `adminRestoreGuardianship`, `adminReactivateUser` in `src/app/[locale]/admin/users/[id]/actions.ts` (with `requireAdmin` per `deployment-and-auth.md` §4.6, zod, audit-trail writes).
- [ ] TG15. `src/components/UserPicker.tsx` (typeahead modal).
- [ ] TG16. Guardianships section on `/admin/users/[id]` with audit trail.

### Phase G5 — Competition registration linkage
- [ ] TG17. Update admin competitor-create action to set `athleteId` (from picker) and `registeredById` (from session).
- [ ] TG18. Add user-picker UI on `/admin/competitions/[id]/competitors/new`.
- [ ] TG19. Spec hook: ensure the future public registration page (`spec.md` §8.2) opens with a "Registering for" selector populated from `getDependents`.

### Phase G6 — RLS policies
- [ ] TG20. Migration: guardian-aware RLS policies on `User`, `UserProfile`, `Competitor`, `Guardianship` per §7.
- [ ] TG21. RLS smoke tests: parent reads/edits child OK; parent reads unrelated user blocked; child reads parent blocked; parent inserts Guardianship for new dependent OK; parent inserts Guardianship pointing at a user with non-null `authUserId` blocked.

---

## 11. Verification

End-to-end scenarios that must pass before this feature can be considered shippable:

1. **Self-service create:** Logged-in parent A clicks "+ Add child", fills the form, submits → new dependent appears on the Family panel; parent redirected to the new dependent's overview. No admin involved. `Guardianship.createdById = parent.id`.
2. **Self-service edit:** Parent edits child's club via `/profile/dependents/<id>/edit`. Change persists; child's overview reflects it; parent's own profile unchanged.
3. **Self-service soft-delete (sole guardian):** Parent removes the child. Guardianship → REVOKED with `revokedById = parent.id`; child's `UserProfile.active = false`; child no longer on Family panel.
4. **Self-service soft-delete (multi-guardian):** After admin has added parent B as a second guardian, parent A removes the child. Only parent A's Guardianship is REVOKED; child's `UserProfile.active` stays true; parent B still sees the child.
5. **Self-service restore:** Parent (who soft-deleted) restores the child. Guardianship → ACTIVE; `UserProfile.active` flipped back to true if it was the sole-guardian revocation.
6. **Rate limit:** Parent attempts 6 `createDependent` calls in an hour → 6th rejected with a clear error.
7. **Cycle guardrail:** Parent attempts to create a dependent whose computed graph would point back to themselves → rejected.
8. **Cannot self-delete a logged-in child:** Parent attempts `softDeleteDependent` for a child whose `authUserId IS NOT NULL` → rejected with a clear message.
9. **View child overview / history:** Parent clicks child card → overview, edit, all four history pages render the child's data with the "Viewing as" banner.
10. **Register child for competition:** Parent (or admin) registers the child via the picker. New `Competitor` row has `athleteId = child.id` and `registeredById = parent.id`. Row appears in parent's `/profile/history/registrations` and in the child's competitor list.
11. **Authorization gates:** Parent loads `/profile/dependents/<unrelated-user-id>` → 403. Direct call to `updateDependent` with unrelated user ID → rejected. Child logs in, loads `/profile/dependents/<parent-id>` → 403. Child's `/profile` shows the parent under "Managed by" but offers no edit / management actions.
12. **Admin overrides:** Admin adds a second guardian via `/admin/users/<child-id>`. Admin revokes a parent-created Guardianship (audit trail shows `revokedById = admin.id`). Admin reactivates a soft-deleted child.
13. **RLS smoke:** As `app_user` with the parent's `auth.uid()` set, `SELECT * FROM "UserProfile" WHERE "userId" = '<child>'` returns the row; with an unrelated `auth.uid()` it returns zero rows. INSERT into `Guardianship` with `guardianId = auth.uid()` and a dependent-only target succeeds; INSERT with a dependent whose `authUserId IS NOT NULL` is blocked.

---

## 12. Open Questions

These do not block the spec but should be resolved during or before implementation:

1. **Age threshold for self-claim.** Finland's GDPR digital-consent age is 13. Does the federation want children to claim their own login at 13, or only at 15 (typical youth license age), or admin-discretion only? Affects the future self-claim flow, not this spec's first cut.
2. **Cross-parent invitations.** v1 limits a parent to creating only *new* dependents; adding a second guardian to an existing dependent requires admin. Confirm whether the federation wants a self-service invite flow (parent A emails parent B a join link) in a near follow-up, or admin-only is acceptable indefinitely.
3. **Notification on relationship change.** When a parent or admin links/revokes, should affected users be emailed? Requires SMTP wiring (see `deployment-and-auth.md` open question #4). Default for v1: no notification.
4. **Guardianship visibility to other users.** Should a competition manager see "registered by <parent>" in the admin competitors list? Suggested default: yes — it's already implicit in `registeredById`.
5. **Rate-limit thresholds.** Suggested 5 dependent-creations per hour per user — confirm or adjust.
6. **TeamEntry kata pairs.** When TeamEntry lands (D19), how should kata pair consent work if only one half's guardian initiates? Out of scope here; needs its own decision.
