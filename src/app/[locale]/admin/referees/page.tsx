import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import { ROLE_KEYS, ROLE_BADGE_LABEL, type RoleKey } from "../users/roles";

export default async function AdminRefereesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.referees" });

  let users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile:
      | (Record<RoleKey, boolean> & {
          geographicArea: string | null;
          refereeLicenseLevel: string | null;
          active: boolean;
        })
      | null;
  }> = [];
  try {
    users = await prisma.user.findMany({
      where: { profile: { is: { isReferee: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true, firstName: true, lastName: true, email: true,
        profile: {
          select: {
            isAdministrator: true,
            isCommission: true,
            isCoordinator: true,
            isCompetitionManager: true,
            isCompetitionAssistant: true,
            isCompetitionResponsible: true,
            isCourseInstructor: true,
            isReferee: true,
            isJudoShiaiOperator: true,
            isVideoOperator: true,
            geographicArea: true,
            refereeLicenseLevel: true,
            active: true,
          },
        },
      },
    });
  } catch {
    // ignore
  }

  function badges(p: NonNullable<typeof users[number]["profile"]>): string[] {
    return ROLE_KEYS.filter((k) => p[k]).map((k) => ROLE_BADGE_LABEL[k]);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/referees/new`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + {t("new")}
        </Link>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">{t("no_users")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-4 pr-3">Name</th>
                <th className="py-2.5 pr-3">Email</th>
                <th className="py-2.5 pr-3">Area</th>
                <th className="py-2.5 pr-3">License</th>
                <th className="py-2.5 pr-4">Roles</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                  u.profile && !u.profile.active ? "opacity-50" : ""
                }`}>
                  <td className="py-2.5 pl-4 pr-3 font-medium">
                    <Link href={`/${locale}/admin/referees/${u.id}`} className="text-primary-light hover:underline">
                      {fullName(u.firstName, u.lastName)}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-600">{u.email}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{u.profile?.geographicArea ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{u.profile?.refereeLicenseLevel ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    {u.profile && badges(u.profile).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {badges(u.profile).map((b) => (
                          <span
                            key={b}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
