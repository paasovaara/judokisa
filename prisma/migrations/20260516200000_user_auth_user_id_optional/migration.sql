-- Amend D27 (docs/deployment-and-auth.md) per docs/guardianship.md §4.2:
-- User.id is the cuid (unchanged); the link to auth.users is a separate
-- optional column. Dependent-only accounts (per docs/guardianship.md) have
-- both authUserId and email set to NULL until the user claims a login.
--
-- The FK to auth.users is not declared here because Prisma migrations do
-- not own the auth schema; the relationship is enforced at the application
-- layer (session reader looks up User by authUserId; backfill scripts
-- match by email).

ALTER TABLE "User" ADD COLUMN "authUserId" text;
ALTER TABLE "User" ADD CONSTRAINT "User_authUserId_key" UNIQUE ("authUserId");

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
