import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { RefereeInviteStatus } from "@prisma/client";
import { requireCurrentUser } from "@/lib/session";
import { getUserRefereeJobs } from "@/lib/profileHistory";

const STATUS_CLASS: Record<RefereeInviteStatus, string> = {
  ASKED:    "bg-blue-100 text-blue-800",
  PROMISED: "bg-amber-100 text-amber-800",
  AGREED:   "bg-emerald-100 text-emerald-800",
  PRESENT:  "bg-green-100 text-success",
  DECLINED: "bg-gray-100 text-gray-600",
};

export default async function ProfileRefereePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  const t = await getTranslations({ locale, namespace: "profile.history" });
  const tStatus = await getTranslations({ locale, namespace: "admin.referees" });

  const jobs = await getUserRefereeJobs(user.id);
  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  if (jobs.length === 0) {
    return <p className="text-sm text-gray-500">{t("empty_referee")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2.5 pl-4 pr-3">{t("col_date")}</th>
            <th className="py-2.5 pr-3">{t("col_competition")}</th>
            <th className="py-2.5 pr-3">{t("col_invited_at")}</th>
            <th className="py-2.5 pr-4">{t("col_status")}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr
              key={`${j.competitionId}-${j.refereeId}`}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              <td className="py-2.5 pl-4 pr-3 text-gray-600">{fmt.format(j.competition.dateStart)}</td>
              <td className="py-2.5 pr-3 font-medium">
                <Link
                  href={`/${locale}/competitions/${j.competition.slug}`}
                  className="text-primary-light hover:underline"
                >
                  {j.competition.name}
                </Link>
                <span className="ml-2 text-xs text-gray-500">{j.competition.city}</span>
              </td>
              <td className="py-2.5 pr-3 text-gray-600">{fmt.format(j.invitedAt)}</td>
              <td className="py-2.5 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[j.status]}`}>
                  {tStatus(`status_${j.status}`)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
