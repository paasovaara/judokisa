import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import UsersFilters from "./UsersFilters";
import { ROLE_KEYS, ROLE_BADGE_LABEL, type RoleKey } from "./roles";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const role = (sp.role ?? "").trim();
  const status = (sp.status ?? "").trim();

  const t = await getTranslations({ locale, namespace: "admin.users" });

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  const profileWhere: Prisma.UserProfileWhereInput = {};
  if (role && (ROLE_KEYS as readonly string[]).includes(role)) {
    profileWhere[role as RoleKey] = true;
  }
  if (status === "active") profileWhere.active = true;
  if (status === "inactive") profileWhere.active = false;
  if (status === "blacklisted") profileWhere.blacklisted = true;
  if (Object.keys(profileWhere).length > 0) {
    where.profile = { is: profileWhere };
  }

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
          blacklisted: boolean;
        })
      | null;
  }> = [];
  try {
    users = await prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
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
            blacklisted: true,
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
          href={`/${locale}/admin/users/new`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + {t("new")}
        </Link>
      </div>

      <UsersFilters
        searchPlaceholder={t("search_placeholder")}
        roleLabel={t("filter_role")}
        statusLabel={t("filter_status")}
        roleOptions={ROLE_KEYS.map((k) => ({ value: k, label: t(`roles.${k}`) }))}
        statusOptions={[
          { value: "active", label: t("status_active") },
          { value: "inactive", label: t("status_inactive") },
          { value: "blacklisted", label: t("status_blacklisted") },
        ]}
      />

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">{t("no_users")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-4 pr-3">{t("col_name")}</th>
                <th className="py-2.5 pr-3">{t("col_email")}</th>
                <th className="py-2.5 pr-3">{t("col_area")}</th>
                <th className="py-2.5 pr-3">{t("col_license")}</th>
                <th className="py-2.5 pr-3">{t("col_roles")}</th>
                <th className="py-2.5 pr-4">{t("col_status")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const inactive = u.profile && !u.profile.active;
                const blacklisted = u.profile?.blacklisted ?? false;
                return (
                  <tr
                    key={u.id}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                      inactive ? "opacity-60" : ""
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-3 font-medium">
                      <Link
                        href={`/${locale}/admin/users/${u.id}`}
                        className="text-primary-light hover:underline"
                      >
                        {fullName(u.firstName, u.lastName)}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600">{u.email}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{u.profile?.geographicArea ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{u.profile?.refereeLicenseLevel ?? "—"}</td>
                    <td className="py-2.5 pr-3">
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
                    <td className="py-2.5 pr-4 text-xs">
                      {blacklisted ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-danger">
                          {t("status_blacklisted")}
                        </span>
                      ) : inactive ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500">
                          {t("status_inactive")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-success">
                          {t("status_active")}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
