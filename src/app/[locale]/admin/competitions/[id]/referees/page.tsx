import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import { inviteReferee, setInvitationStatus, uninviteReferee } from "./actions";
import InvitationStatusSelect from "./InvitationStatusSelect";

const STATUSES = ["ASKED", "PROMISED", "AGREED", "DECLINED", "PRESENT"] as const;
const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";

export default async function CompetitionRefereesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const [competition, allReferees, invitations] = await Promise.all([
    prisma.competition.findUnique({
      where: { id },
      select: { id: true, targetRefereeCount: true },
    }),
    // Anyone with the referee role flag — used as the picker source
    prisma.user.findMany({
      where: { profile: { isReferee: true } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true, firstName: true, lastName: true, email: true,
        profile: { select: { geographicArea: true, refereeLicenseLevel: true, club: true } },
      },
    }),
    prisma.competitionRefereeInvitation.findMany({
      where: { competitionId: id },
      orderBy: [{ status: "asc" }, { invitedAt: "asc" }],
      include: {
        referee: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            profile: { select: { geographicArea: true, refereeLicenseLevel: true, club: true } },
          },
        },
      },
    }),
  ]);
  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "admin.referees" });

  const invitedIds = new Set(invitations.map((i) => i.refereeId));
  const uninvited = allReferees.filter((r) => !invitedIds.has(r.id));

  async function inviteAction(form: FormData) {
    "use server";
    const refereeId = ((form.get("refereeId") ?? "") as string).trim();
    await inviteReferee(locale, id, refereeId);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
          <span className="text-xs text-gray-500">
            {invitations.length}{competition.targetRefereeCount > 0 ? ` / ${competition.targetRefereeCount}` : ""}
          </span>
        </div>

        {invitations.length === 0 ? (
          <p className="text-sm text-gray-500">{t("no_invitations")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2.5 pl-4 pr-3">Referee</th>
                  <th className="py-2.5 pr-3">Email</th>
                  <th className="py-2.5 pr-3">Area</th>
                  <th className="py-2.5 pr-3">License</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.refereeId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-3 font-medium">
                      {fullName(inv.referee.firstName, inv.referee.lastName)}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600">{inv.referee.email}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{inv.referee.profile?.geographicArea ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{inv.referee.profile?.refereeLicenseLevel ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      <InvitationStatusSelect
                        current={inv.status}
                        options={STATUSES.map((s) => ({ value: s, label: t(`status_${s}`) }))}
                        action={async (status) => {
                          "use server";
                          await setInvitationStatus(locale, id, inv.refereeId, status);
                        }}
                      />
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await uninviteReferee(locale, id, inv.refereeId);
                        }}
                      >
                        <button type="submit" className="text-xs text-danger hover:underline">
                          ✕
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite picker */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">{t("invite")}</h3>
        {uninvited.length === 0 ? (
          <p className="text-sm text-gray-500">{t("no_users")}</p>
        ) : (
          <form action={inviteAction} className="flex gap-3">
            <select name="refereeId" required className={inputCls}>
              <option value="">— Select referee —</option>
              {uninvited.map((r) => (
                <option key={r.id} value={r.id}>
                  {fullName(r.firstName, r.lastName)}
                  {r.profile?.geographicArea ? ` (${r.profile.geographicArea})` : ""}
                  {r.profile?.refereeLicenseLevel ? ` · ${r.profile.refereeLicenseLevel}` : ""}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {t("invite")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
