-- Replace UserProfile.club (free text) with a FK to Club.id.
-- Backfills clubId from any free-text value that exactly matches a Club.displayName
-- (case-insensitive), then drops the old text column. Any value that does not
-- match an existing Club is lost — admins can re-pick from the dropdown.

-- AlterTable: add the FK column first
ALTER TABLE "UserProfile" ADD COLUMN "clubId" TEXT;

-- Backfill from text → FK where there's a unique match on Club.displayName
UPDATE "UserProfile" up
SET "clubId" = c."id"
FROM "Club" c
WHERE up."club" IS NOT NULL
  AND lower(up."club") = lower(c."displayName");

-- Drop the old free-text column
ALTER TABLE "UserProfile" DROP COLUMN "club";

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
