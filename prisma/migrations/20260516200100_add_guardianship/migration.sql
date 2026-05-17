-- Guardianship model + helper SQL function for RLS.
-- See docs/guardianship.md §4.1, §5.2.

CREATE TYPE "GuardianshipRelation" AS ENUM ('PARENT', 'LEGAL_GUARDIAN', 'OTHER');
CREATE TYPE "GuardianshipStatus"   AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "Guardianship" (
  "guardianId"  text         NOT NULL,
  "dependentId" text         NOT NULL,
  "relation"    "GuardianshipRelation" NOT NULL DEFAULT 'PARENT',
  "status"      "GuardianshipStatus"   NOT NULL DEFAULT 'ACTIVE',
  "createdAt"   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" text,
  "revokedAt"   timestamp(3),
  "revokedById" text,

  CONSTRAINT "Guardianship_pkey"            PRIMARY KEY ("guardianId", "dependentId"),
  CONSTRAINT "Guardianship_no_self_check"   CHECK ("guardianId" <> "dependentId")
);

CREATE INDEX "Guardianship_guardianId_idx"  ON "Guardianship" ("guardianId");
CREATE INDEX "Guardianship_dependentId_idx" ON "Guardianship" ("dependentId");
CREATE INDEX "Guardianship_status_idx"      ON "Guardianship" ("status");

ALTER TABLE "Guardianship" ADD CONSTRAINT "Guardianship_guardianId_fkey"
  FOREIGN KEY ("guardianId")  REFERENCES "User"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Guardianship" ADD CONSTRAINT "Guardianship_dependentId_fkey"
  FOREIGN KEY ("dependentId") REFERENCES "User"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Guardianship" ADD CONSTRAINT "Guardianship_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Guardianship" ADD CONSTRAINT "Guardianship_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS on Guardianship is enabled now; policies are added once the auth
-- layer maps a Supabase JWT to a User.id (see docs/guardianship.md §7).
ALTER TABLE "Guardianship" ENABLE ROW LEVEL SECURITY;

-- Helper function: is the given guardian an active guardian of the given
-- dependent? Used by RLS policies on User, UserProfile, Competitor, and
-- Guardianship itself. STABLE because it depends only on Guardianship rows
-- (which can change between transactions, but is consistent within one).
CREATE OR REPLACE FUNCTION is_guardian_of(guardian text, dependent text)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Guardianship"
    WHERE "guardianId"  = guardian
      AND "dependentId" = dependent
      AND status = 'ACTIVE'
  );
$$;
