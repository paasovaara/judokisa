import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { weightClassLabel } from "@/lib/format";
import { createCategory, deleteCategory, seedDefaultCategories } from "./actions";

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: {
      categories: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, nameEn: true, nameFi: true, minAge: true, maxAge: true, gender: true, weightClasses: true },
      },
    },
  });
  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "admin.categories" });
  const tComp = await getTranslations({ locale, namespace: "admin.competitions" });

  async function createAction(form: FormData) {
    "use server";
    await createCategory(locale, id, form);
  }

  async function seedAction() {
    "use server";
    await seedDefaultCategories(locale, id);
  }

  return (
    <div className="space-y-6">
      {/* Existing categories */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
          {competition.categories.length === 0 && (
            <form action={seedAction}>
              <button
                type="submit"
                className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
              >
                {t("seed_defaults")}
              </button>
            </form>
          )}
        </div>

        {competition.categories.length === 0 ? (
          <p className="text-sm text-gray-500">{t("no_categories")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2.5 pl-4 pr-3">{t("code")}</th>
                  <th className="py-2.5 pr-3">{t("name_en")}</th>
                  <th className="py-2.5 pr-3">{t("name_fi")}</th>
                  <th className="py-2.5 pr-3">{t("min_age")}</th>
                  <th className="py-2.5 pr-3">{t("max_age")}</th>
                  <th className="py-2.5 pr-3">{t("gender")}</th>
                  <th className="py-2.5 pr-3">{t("weight_classes")}</th>
                  <th className="py-2.5 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {competition.categories.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-3 font-mono text-xs">{c.code}</td>
                    <td className="py-2.5 pr-3">{c.nameEn}</td>
                    <td className="py-2.5 pr-3">{c.nameFi}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{c.minAge || "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{c.maxAge || "—"}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{c.gender}</td>
                    <td className="py-2.5 pr-3 text-gray-600">
                      {c.weightClasses.map(weightClassLabel).join(", ")}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteCategory(locale, id, c.id);
                        }}
                      >
                        <button type="submit" className="text-xs text-danger hover:underline">
                          {tComp("delete")}
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

      {/* New category form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">{t("new")}</h3>
        <form action={createAction} className="grid gap-3 sm:grid-cols-3">
          <input name="code" placeholder={t("code")} required className={inputCls} />
          <input name="nameEn" placeholder={t("name_en")} required className={inputCls} />
          <input name="nameFi" placeholder={t("name_fi")} required className={inputCls} />
          <input type="number" min="0" name="minAge" placeholder={t("min_age")} className={inputCls} />
          <input type="number" min="0" name="maxAge" placeholder={t("max_age")} className={inputCls} />
          <select name="gender" defaultValue="BOTH" className={inputCls}>
            <option value="MEN">MEN</option>
            <option value="WOMEN">WOMEN</option>
            <option value="BOTH">BOTH</option>
          </select>
          <input
            name="weightClasses"
            placeholder={t("weight_classes")}
            className={`${inputCls} sm:col-span-3`}
          />
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
