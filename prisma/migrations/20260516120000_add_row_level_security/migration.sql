-- Row level security (RLS)
--
-- Context: the database is Supabase Postgres and the app currently connects
-- as the `postgres` role, which has BYPASSRLS. Enabling RLS here therefore
-- has no effect on the current frontend, scraper, or admin paths -- it lays
-- down policies that engage as soon as the frontend (or any other consumer)
-- starts using a less-privileged role such as Supabase's `anon` /
-- `authenticated`, or a dedicated readonly role.
--
-- Strategy:
--   * Tables that hold public, browsable data get a permissive SELECT
--     policy for anon + authenticated.
--   * Tables that hold PII or internal workflow state (User, UserProfile,
--     CompetitionRefereeInvitation) get NO policy, so RLS denies all
--     access to those roles by default. A later migration can layer in
--     per-row "read your own row" policies once real auth is wired in.
--   * Writes are not addressed here -- with no INSERT/UPDATE/DELETE
--     policies, anon/authenticated cannot write to any table.

-- 1. Make sure the Supabase-style roles exist. This is a no-op on Supabase
--    and creates them on a vanilla Postgres so the migration stays portable.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
END
$$;

-- 2. Enable RLS on every application table.
ALTER TABLE "Competition"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompetitionCategory"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Club"                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Competitor"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Result"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match"                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VideoFeed"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserProfile"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompetitionRefereeInvitation" ENABLE ROW LEVEL SECURITY;

-- 3. Public-readable tables.
CREATE POLICY "Public read" ON "Competition"
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read" ON "CompetitionCategory"
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read" ON "Club"
  FOR SELECT TO anon, authenticated USING (true);

-- Hide soft-deleted competitors from public reads.
CREATE POLICY "Public read non-removed" ON "Competitor"
  FOR SELECT TO anon, authenticated USING (removed = false);

CREATE POLICY "Public read" ON "Result"
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read" ON "Match"
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public read" ON "VideoFeed"
  FOR SELECT TO anon, authenticated USING (true);

-- 4. PII column restriction on Competitor: phone + email should not be
--    visible to public roles even when SELECTing through the policy above.
--    Postgres column-level grants only take effect once the table-level
--    SELECT grant is removed, so we swap the table grant for an explicit
--    column list.
REVOKE SELECT ON "Competitor" FROM anon, authenticated;
GRANT  SELECT (
  id,
  "competitionId",
  "firstName",
  "lastName",
  "yearOfBirth",
  gender,
  country,
  "clubId",
  "clubName",
  "categoryId",
  "weightClass",
  "judoGrade",
  "registeredById",
  "athleteId",
  "licenseValid",
  "ageEligible",
  removed,
  "extraFieldValues",
  "createdAt",
  "updatedAt"
) ON "Competitor" TO anon, authenticated;

-- 5. User, UserProfile, CompetitionRefereeInvitation: no policy -> RLS
--    blocks every read/write from anon and authenticated. Add per-row
--    policies in a follow-up migration once a real auth layer maps
--    current_setting('request.jwt.claim.sub') (or equivalent) to User.id.
