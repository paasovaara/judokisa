import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { createVideoFeed, deleteVideoFeed } from "./actions";

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";

export default async function VideoFeedsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: {
      videoFeeds: {
        orderBy: [{ tatamiNumber: "asc" }, { name: "asc" }],
        select: { id: true, name: true, tatamiNumber: true, url: true },
      },
    },
  });
  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "admin.video_feeds" });
  const tComp = await getTranslations({ locale, namespace: "admin.competitions" });

  async function createAction(form: FormData) {
    "use server";
    await createVideoFeed(locale, id, form);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">{t("title")}</h2>
        {competition.videoFeeds.length === 0 ? (
          <p className="text-sm text-gray-500">{t("no_feeds")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2.5 pl-4 pr-3">Tatami</th>
                  <th className="py-2.5 pr-3">Name</th>
                  <th className="py-2.5 pr-3">URL</th>
                  <th className="py-2.5 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {competition.videoFeeds.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-3">{f.tatamiNumber ?? "—"}</td>
                    <td className="py-2.5 pr-3">{f.name}</td>
                    <td className="py-2.5 pr-3">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary-light hover:underline">
                        {f.url}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteVideoFeed(locale, id, f.id);
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

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">{t("new")}</h3>
        <form action={createAction} className="grid gap-3 sm:grid-cols-3">
          <input type="number" min="1" max="4" name="tatamiNumber" placeholder="Tatami # (1–4)" className={inputCls} />
          <input name="name" placeholder="Name (e.g. Tatami 1)" required className={inputCls} />
          <input name="url" type="url" placeholder="https://…" required className={inputCls} />
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
