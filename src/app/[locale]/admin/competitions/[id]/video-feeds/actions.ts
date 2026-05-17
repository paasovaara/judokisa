"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function createVideoFeed(locale: string, competitionId: string, form: FormData) {
  await requireAdmin(locale);
  const name = ((form.get("name") ?? "") as string).trim();
  const url = ((form.get("url") ?? "") as string).trim();
  const tatamiRaw = ((form.get("tatamiNumber") ?? "") as string).trim();
  const tatamiNumber = tatamiRaw === "" ? null : parseInt(tatamiRaw, 10);
  if (!name || !url) throw new Error("name and url required");

  await prisma.videoFeed.create({
    data: {
      competitionId,
      name,
      url,
      tatamiNumber: tatamiNumber != null && !isNaN(tatamiNumber) ? tatamiNumber : null,
    },
  });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/video-feeds`);
}

export async function deleteVideoFeed(locale: string, competitionId: string, id: string) {
  await requireAdmin(locale);
  await prisma.videoFeed.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/competitions/${competitionId}/video-feeds`);
}
