import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";

export default async function AdminCompetitionsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.competitions" });
  const tStatus = await getTranslations({ locale, namespace: "status" });
  const tTypes = await getTranslations({ locale, namespace: "types" });

  let competitions: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    level: string | null;
    status: string;
    dateStart: Date;
    dateEnd: Date;
    city: string;
    registeredCount: number;
    capacity: number | null;
  }> = [];
  try {
    competitions = await prisma.competition.findMany({
      orderBy: { dateStart: "desc" },
      select: {
        id: true, name: true, slug: true, type: true, level: true, status: true,
        dateStart: true, dateEnd: true, city: true, registeredCount: true, capacity: true,
      },
    });
  } catch {
    // ignore
  }

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Link
          href={`/${locale}/admin/competitions/new`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + {t("new")}
        </Link>
      </div>

      {competitions.length === 0 ? (
        <p className="text-sm text-gray-500">{t("no_results")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-4 pr-3">{t("form.name")}</th>
                <th className="py-2.5 pr-3">{t("form.date_start")}</th>
                <th className="py-2.5 pr-3">{t("form.city")}</th>
                <th className="py-2.5 pr-3">{t("form.type")}</th>
                <th className="py-2.5 pr-3">{t("form.level")}</th>
                <th className="py-2.5 pr-3">{t("form.status")}</th>
                <th className="py-2.5 pr-4">{t("form.capacity")}</th>
              </tr>
            </thead>
            <tbody>
              {competitions.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2.5 pl-4 pr-3 font-medium">
                    <Link
                      href={`/${locale}/admin/competitions/${c.id}`}
                      className="text-primary-light hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="ml-2 text-xs text-gray-400">{c.slug}</span>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-gray-600">{fmt.format(c.dateStart)}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{c.city}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{tTypes(c.type as Parameters<typeof tTypes>[0])}</td>
                  <td className="py-2.5 pr-3 text-gray-500">{c.level ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{tStatus(c.status as Parameters<typeof tStatus>[0])}</td>
                  <td className="py-2.5 pr-4 text-gray-600">
                    {c.registeredCount}{c.capacity != null ? ` / ${c.capacity}` : ""}
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
