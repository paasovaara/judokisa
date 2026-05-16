import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";

export default async function AdminClubsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.clubs" });

  let clubs: Array<{
    id: string;
    displayName: string;
    country: string;
    suomiSportName: string | null;
    _count: { competitors: number; userProfiles: number };
  }> = [];
  try {
    clubs = await prisma.club.findMany({
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        country: true,
        suomiSportName: true,
        _count: { select: { competitors: true, userProfiles: true } },
      },
    });
  } catch {
    // ignore
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/clubs/new`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + {t("new")}
        </Link>
      </div>

      {clubs.length === 0 ? (
        <p className="text-sm text-gray-500">{t("no_clubs")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-4 pr-3">{t("form.display_name")}</th>
                <th className="py-2.5 pr-3">{t("form.country")}</th>
                <th className="py-2.5 pr-3">{t("form.suomi_sport_name")}</th>
                <th className="py-2.5 pr-3">{t("members_count")}</th>
                <th className="py-2.5 pr-4">{t("competitors_count")}</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2.5 pl-4 pr-3 font-medium">
                    <Link
                      href={`/${locale}/admin/clubs/${c.id}`}
                      className="text-primary-light hover:underline"
                    >
                      {c.displayName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-600">{c.country}</td>
                  <td className="py-2.5 pr-3 text-gray-500">{c.suomiSportName ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{c._count.userProfiles}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{c._count.competitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
