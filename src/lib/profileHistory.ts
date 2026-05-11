// Queries for the authenticated user's profile history.
// All match strictly by FK (athleteId / refereeId / registeredById) — name
// fields stay on the rows for historical lineage but aren't used for lookup.

import { prisma } from "@/lib/db";

export async function getUserResults(userId: string) {
  return prisma.result.findMany({
    where: { athleteId: userId },
    include: {
      competition: { select: { name: true, city: true, slug: true, dateStart: true, status: true } },
      category: { select: { code: true, nameEn: true, nameFi: true } },
    },
    orderBy: { competition: { dateStart: "desc" } },
    take: 200,
  });
}

export async function getUserMatches(userId: string) {
  return prisma.match.findMany({
    where: {
      OR: [{ athlete1Id: userId }, { athlete2Id: userId }],
    },
    include: {
      competition: { select: { name: true, city: true, slug: true, dateStart: true } },
      category: { select: { code: true, nameEn: true, nameFi: true } },
    },
    orderBy: { competition: { dateStart: "desc" } },
    take: 200,
  });
}

export async function getUserRefereeJobs(userId: string) {
  return prisma.competitionRefereeInvitation.findMany({
    where: { refereeId: userId },
    include: {
      competition: {
        select: {
          name: true,
          city: true,
          slug: true,
          dateStart: true,
          status: true,
        },
      },
    },
    orderBy: { invitedAt: "desc" },
    take: 200,
  });
}

export async function getUserRegistrations(userId: string) {
  return prisma.competitor.findMany({
    where: { registeredById: userId },
    include: {
      competition: { select: { name: true, city: true, slug: true, dateStart: true } },
      category: { select: { code: true, nameEn: true, nameFi: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

// Lightweight counts for the overview dashboard. Failure → 0 so the page still
// renders if the DB is unreachable.
async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

export function countUserResults(userId: string) {
  return safeCount(() => prisma.result.count({ where: { athleteId: userId } }));
}

export function countUserMatches(userId: string) {
  return safeCount(() =>
    prisma.match.count({
      where: { OR: [{ athlete1Id: userId }, { athlete2Id: userId }] },
    }),
  );
}

export function countUserRefereeJobs(userId: string) {
  return safeCount(() => prisma.competitionRefereeInvitation.count({ where: { refereeId: userId } }));
}

export function countUserRegistrations(userId: string) {
  return safeCount(() => prisma.competitor.count({ where: { registeredById: userId } }));
}
