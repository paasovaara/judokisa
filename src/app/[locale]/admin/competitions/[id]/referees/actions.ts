"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { RefereeInviteStatus } from "@prisma/client";

const STATUSES = ["ASKED", "DECLINED", "PROMISED", "AGREED", "PRESENT"] as const;

export async function inviteReferee(locale: string, competitionId: string, refereeId: string) {
  if (!refereeId) return;
  await prisma.competitionRefereeInvitation.upsert({
    where: { competitionId_refereeId: { competitionId, refereeId } },
    create: { competitionId, refereeId, status: "ASKED" },
    update: { status: "ASKED", invitedAt: new Date(), respondedAt: null },
  });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/referees`);
}

export async function setInvitationStatus(
  locale: string,
  competitionId: string,
  refereeId: string,
  status: string,
) {
  if (!(STATUSES as readonly string[]).includes(status)) return;
  await prisma.competitionRefereeInvitation.update({
    where: { competitionId_refereeId: { competitionId, refereeId } },
    data: {
      status: status as RefereeInviteStatus,
      respondedAt: status === "ASKED" ? null : new Date(),
    },
  });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/referees`);
}

export async function uninviteReferee(locale: string, competitionId: string, refereeId: string) {
  await prisma.competitionRefereeInvitation.delete({
    where: { competitionId_refereeId: { competitionId, refereeId } },
  });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/referees`);
}
