-- Guardian-aware RLS policies on User, UserProfile, Competitor, and
-- Guardianship. See docs/guardianship.md §7 for the contract.
--
-- Wrapped in a DO block that checks for the Supabase `auth` schema first.
-- In local/shadow-DB environments the block exits early with a NOTICE and no
-- error, so `prisma migrate dev` succeeds. In production the block runs in
-- full and all policies take effect.

DO $migration$
BEGIN

IF NOT EXISTS (
  SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'
) THEN
  RAISE NOTICE 'auth schema not found – skipping guardian-aware RLS policies (non-Supabase environment)';
  RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT "id" FROM "User" WHERE "authUserId" = auth.uid()::text
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (
      SELECT
        p."isAdministrator"
        OR p."isCommission"
        OR p."isCoordinator"
        OR p."isCompetitionManager"
        OR p."isCompetitionAssistant"
        OR p."isCompetitionResponsible"
        OR p."isCourseInstructor"
      FROM "UserProfile" p
      WHERE p."userId" = current_user_id()
      LIMIT 1
    ),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- User
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "User self or guardian read" ON "User";
CREATE POLICY "User self or guardian read" ON "User"
  FOR SELECT TO authenticated USING (
    "id" = current_user_id()
    OR is_guardian_of(current_user_id(), "id")
    OR current_user_is_admin()
  );

DROP POLICY IF EXISTS "User self or guardian update" ON "User";
CREATE POLICY "User self or guardian update" ON "User"
  FOR UPDATE TO authenticated USING (
    "id" = current_user_id()
    OR is_guardian_of(current_user_id(), "id")
    OR current_user_is_admin()
  );

DROP POLICY IF EXISTS "User dependent-only insert" ON "User";
CREATE POLICY "User dependent-only insert" ON "User"
  FOR INSERT TO authenticated WITH CHECK (
    current_user_is_admin()
    OR "authUserId" IS NULL
  );

DROP POLICY IF EXISTS "User admin delete" ON "User";
CREATE POLICY "User admin delete" ON "User"
  FOR DELETE TO authenticated USING (current_user_is_admin());

-- ---------------------------------------------------------------------------
-- UserProfile
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "UserProfile self or guardian read" ON "UserProfile";
CREATE POLICY "UserProfile self or guardian read" ON "UserProfile"
  FOR SELECT TO authenticated USING (
    "userId" = current_user_id()
    OR is_guardian_of(current_user_id(), "userId")
    OR current_user_is_admin()
  );

DROP POLICY IF EXISTS "UserProfile self or guardian update" ON "UserProfile";
CREATE POLICY "UserProfile self or guardian update" ON "UserProfile"
  FOR UPDATE TO authenticated USING (
    "userId" = current_user_id()
    OR is_guardian_of(current_user_id(), "userId")
    OR current_user_is_admin()
  );

DROP POLICY IF EXISTS "UserProfile insert paired with User" ON "UserProfile";
CREATE POLICY "UserProfile insert paired with User" ON "UserProfile"
  FOR INSERT TO authenticated WITH CHECK (
    current_user_is_admin()
    OR "userId" = current_user_id()
    OR is_guardian_of(current_user_id(), "userId")
  );

DROP POLICY IF EXISTS "UserProfile admin delete" ON "UserProfile";
CREATE POLICY "UserProfile admin delete" ON "UserProfile"
  FOR DELETE TO authenticated USING (current_user_is_admin());

-- ---------------------------------------------------------------------------
-- Competitor
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Competitor self or guardian write" ON "Competitor";
CREATE POLICY "Competitor self or guardian write" ON "Competitor"
  FOR INSERT TO authenticated WITH CHECK (
    current_user_is_admin()
    OR (
      "registeredById" = current_user_id()
      AND (
        "athleteId" IS NULL
        OR "athleteId" = current_user_id()
        OR is_guardian_of(current_user_id(), "athleteId")
      )
    )
  );

DROP POLICY IF EXISTS "Competitor self or guardian update" ON "Competitor";
CREATE POLICY "Competitor self or guardian update" ON "Competitor"
  FOR UPDATE TO authenticated USING (
    current_user_is_admin()
    OR "registeredById" = current_user_id()
    OR (
      "athleteId" IS NOT NULL
      AND (
        "athleteId" = current_user_id()
        OR is_guardian_of(current_user_id(), "athleteId")
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Guardianship
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Guardianship participant or admin read" ON "Guardianship";
CREATE POLICY "Guardianship participant or admin read" ON "Guardianship"
  FOR SELECT TO authenticated USING (
    "guardianId"  = current_user_id()
    OR "dependentId" = current_user_id()
    OR current_user_is_admin()
  );

DROP POLICY IF EXISTS "Guardianship self-service insert" ON "Guardianship";
CREATE POLICY "Guardianship self-service insert" ON "Guardianship"
  FOR INSERT TO authenticated WITH CHECK (
    current_user_is_admin()
    OR (
      "guardianId" = current_user_id()
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u."id" = "Guardianship"."dependentId"
          AND u."authUserId" IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "Guardianship guardian or admin update" ON "Guardianship";
CREATE POLICY "Guardianship guardian or admin update" ON "Guardianship"
  FOR UPDATE TO authenticated USING (
    "guardianId" = current_user_id()
    OR current_user_is_admin()
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON "User"         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "UserProfile"  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Guardianship" TO authenticated;
GRANT INSERT, UPDATE ON "Competitor" TO authenticated;

END;
$migration$;
