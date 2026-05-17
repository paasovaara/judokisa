// Guardianship: a guardian (parent / legal guardian / other) can act on
// behalf of a dependent. See docs/guardianship.md §5.1 for the contract.
//
// All queries match by ACTIVE Guardianship rows; revoked rows are audit
// trail only. Self-access (currentUserId === targetUserId) always wins —
// callers don't have to special-case it.

import type { JudoGrade } from "@prisma/client";
import { prisma } from "@/lib/db";

export type DependentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  profile: {
    judoGrade: JudoGrade | null;
    profilePhoto: string | null;
    club: { id: string; displayName: string } | null;
    active: boolean;
  } | null;
};

/**
 * Active dependents (children, etc.) that the given user can manage.
 * Ordered by first name for stable list rendering.
 */
export async function getDependents(guardianUserId: string): Promise<DependentSummary[]> {
  const rows = await prisma.guardianship.findMany({
    where: { guardianId: guardianUserId, status: "ACTIVE" },
    select: {
      dependent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profile: {
            select: {
              judoGrade: true,
              profilePhoto: true,
              active: true,
              club: { select: { id: true, displayName: true } },
            },
          },
        },
      },
    },
    orderBy: [{ dependent: { firstName: "asc" } }],
  });
  return rows.map((r) => r.dependent);
}

/**
 * Active guardians of the given user. Used on a dependent's own profile to
 * show "Managed by ..." (informational, no edit action — dependents cannot
 * reach into their guardian's data).
 */
export async function getGuardians(dependentUserId: string) {
  const rows = await prisma.guardianship.findMany({
    where: { dependentId: dependentUserId, status: "ACTIVE" },
    select: {
      relation: true,
      guardian: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ guardian: { firstName: "asc" } }],
  });
  return rows;
}

/**
 * Can the current user act on behalf of the target user? True iff they are
 * the same user OR there is an active Guardianship row.
 */
export async function canActAs(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (currentUserId === targetUserId) return true;
  const link = await prisma.guardianship.findUnique({
    where: {
      guardianId_dependentId: { guardianId: currentUserId, dependentId: targetUserId },
    },
    select: { status: true },
  });
  return link?.status === "ACTIVE";
}

/**
 * Throw if the current user cannot act as the target. Server actions and
 * `requireTargetUser` should use this rather than open-coding the check.
 */
export async function requireCanActAs(currentUserId: string, targetUserId: string): Promise<void> {
  const ok = await canActAs(currentUserId, targetUserId);
  if (!ok) {
    throw new Error("Forbidden: you cannot act on behalf of this user");
  }
}

/**
 * Count active guardian relationships in either direction. Used by the
 * soft-delete path: if a parent revokes their own guardianship and there
 * are no other active guardians, the dependent's profile is deactivated.
 */
export async function countActiveGuardiansOf(dependentUserId: string): Promise<number> {
  return prisma.guardianship.count({
    where: { dependentId: dependentUserId, status: "ACTIVE" },
  });
}

/**
 * Cycle guardrail: walk up the guardian graph from `candidateGuardianId`
 * with a small depth budget and reject if we ever reach `proposedDependentId`.
 * Cheap because the graph is shallow in practice.
 */
export async function wouldFormCycle(
  proposedGuardianId: string,
  proposedDependentId: string,
  depthBudget = 8,
): Promise<boolean> {
  if (proposedGuardianId === proposedDependentId) return true;
  // Starting from the proposed dependent: who do *they* guardian? If walking
  // forward through their dependents reaches the proposed guardian, the new
  // link would close a cycle.
  let frontier = new Set<string>([proposedDependentId]);
  const seen = new Set<string>([proposedDependentId]);
  for (let depth = 0; depth < depthBudget && frontier.size > 0; depth++) {
    const next = await prisma.guardianship.findMany({
      where: { guardianId: { in: [...frontier] }, status: "ACTIVE" },
      select: { dependentId: true },
    });
    const nextSet = new Set<string>();
    for (const row of next) {
      if (row.dependentId === proposedGuardianId) return true;
      if (!seen.has(row.dependentId)) {
        seen.add(row.dependentId);
        nextSet.add(row.dependentId);
      }
    }
    frontier = nextSet;
  }
  return false;
}
