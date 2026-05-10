import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { fullName, weightClassLabel, judoGradeLabel } from "@/lib/format";
import {
  createCompetitor,
  hardDeleteCompetitor,
  restoreCompetitor,
  softDeleteCompetitor,
} from "./actions";

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none";
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];

export default async function AdminCompetitorsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const [competition, clubs] = await Promise.all([
    prisma.competition.findUnique({
      where: { id },
      select: {
        categories: {
          orderBy: { code: "asc" },
          select: { id: true, code: true, nameEn: true, nameFi: true },
        },
        competitors: {
          orderBy: [{ removed: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true, firstName: true, lastName: true, yearOfBirth: true,
            gender: true, weightClass: true, judoGrade: true, country: true,
            removed: true, clubName: true,
            club: { select: { displayName: true } },
            category: { select: { code: true } },
          },
        },
      },
    }),
    prisma.club.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
  ]);
  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "admin.competitors" });
  const tComp = await getTranslations({ locale, namespace: "admin.competitions" });

  async function createAction(form: FormData) {
    "use server";
    await createCompetitor(locale, id, form);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
          <span className="text-xs text-gray-500">
            {competition.competitors.filter((c) => !c.removed).length} {t("title").toLowerCase()}
          </span>
        </div>

        {competition.competitors.length === 0 ? (
          <p className="text-sm text-gray-500">{t("no_competitors")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2.5 pl-4 pr-3">Name</th>
                  <th className="py-2.5 pr-3">Club</th>
                  <th className="py-2.5 pr-3">Category</th>
                  <th className="py-2.5 pr-3">Weight</th>
                  <th className="py-2.5 pr-3">Born</th>
                  <th className="py-2.5 pr-3">Grade</th>
                  <th className="py-2.5 pr-3">Country</th>
                  <th className="py-2.5 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {competition.competitors.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                      c.removed ? "opacity-50" : ""
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-3 font-medium">
                      {fullName(c.firstName, c.lastName)}
                      {c.removed && (
                        <span className="ml-2 text-xs text-gray-400">{t("soft_deleted")}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-gray-600">{c.club?.displayName ?? c.clubName ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{c.category?.code ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{weightClassLabel(c.weightClass) || "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{c.yearOfBirth ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{judoGradeLabel(c.judoGrade) ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{c.country}</td>
                    <td className="py-2.5 pr-4 text-right">
                      {c.removed ? (
                        <>
                          <form
                            className="inline"
                            action={async () => {
                              "use server";
                              await restoreCompetitor(locale, id, c.id);
                            }}
                          >
                            <button type="submit" className="text-xs text-primary-light hover:underline">
                              Restore
                            </button>
                          </form>
                          <form
                            className="ml-3 inline"
                            action={async () => {
                              "use server";
                              await hardDeleteCompetitor(locale, id, c.id);
                            }}
                          >
                            <button type="submit" className="text-xs text-danger hover:underline">
                              {tComp("delete")}
                            </button>
                          </form>
                        </>
                      ) : (
                        <form
                          action={async () => {
                            "use server";
                            await softDeleteCompetitor(locale, id, c.id);
                          }}
                        >
                          <button type="submit" className="text-xs text-danger hover:underline">
                            {tComp("delete")}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New competitor form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">{t("new")}</h3>
        <form action={createAction} className="grid gap-3 sm:grid-cols-3">
          <input name="firstName" placeholder="First name" required className={inputCls} />
          <input name="lastName" placeholder="Last name" required className={inputCls} />
          <input name="email" type="email" placeholder="Email" className={inputCls} />
          <input name="phone" placeholder="Phone" className={inputCls} />
          <input type="number" min="1900" max="2099" name="yearOfBirth" placeholder="Year of birth" className={inputCls} />
          <select name="gender" defaultValue="UNKNOWN" className={inputCls}>
            <option value="UNKNOWN">Unknown</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          <input name="country" placeholder="Country (FIN)" defaultValue="FIN" className={inputCls} />
          <select name="clubId" defaultValue="" className={inputCls}>
            <option value="">— Club FK —</option>
            {clubs.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
          <input name="clubName" placeholder="Club (free-text)" className={inputCls} />
          <select name="categoryId" defaultValue="" className={inputCls}>
            <option value="">— Category —</option>
            {competition.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {locale === "fi" ? c.nameFi : c.nameEn}</option>
            ))}
          </select>
          <input name="weightClass" placeholder="Weight class (-66 / +100)" className={inputCls} />
          <select name="judoGrade" defaultValue="" className={inputCls}>
            <option value="">— Grade —</option>
            {GRADES.map((g) => <option key={g} value={g}>{judoGradeLabel(g as Parameters<typeof judoGradeLabel>[0]) ?? g}</option>)}
          </select>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {tComp("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
