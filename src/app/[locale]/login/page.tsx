import { getTranslations } from "next-intl/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import { getSessionUserId } from "@/lib/session";
import { loginAs, logout } from "./actions";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const t = await getTranslations({ locale, namespace: "login" });
  const currentUserId = await getSessionUserId();

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  let users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profile: { isAdministrator: boolean; isReferee: boolean; geographicArea: string | null } | null;
  }> = [];
  try {
    users = await prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 200,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profile: { select: { isAdministrator: true, isReferee: true, geographicArea: true } },
      },
    });
  } catch {
    // ignore
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-600">{t("description")}</p>

      <form className="mb-6" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder={t("search_placeholder")}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </form>

      {currentUserId ? (
        <form action={logout.bind(null, locale)} className="mb-6">
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("logout_current")}
          </button>
        </form>
      ) : null}

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">{t("no_users")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-4 pr-3">{t("col_name")}</th>
                <th className="py-2.5 pr-3">{t("col_email")}</th>
                <th className="py-2.5 pr-3">{t("col_role")}</th>
                <th className="py-2.5 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const tag = u.profile?.isAdministrator
                  ? t("tag_admin")
                  : u.profile?.isReferee
                    ? t("tag_referee")
                    : t("tag_user");
                const isCurrent = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-3 font-medium text-gray-900">
                      {fullName(u.firstName, u.lastName)}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600">{u.email}</td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {tag}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {isCurrent ? (
                        <span className="text-xs text-gray-400">{t("current")}</span>
                      ) : (
                        <form action={loginAs.bind(null, locale, u.id)}>
                          <button
                            type="submit"
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          >
                            {t("login_as")}
                          </button>
                        </form>
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
