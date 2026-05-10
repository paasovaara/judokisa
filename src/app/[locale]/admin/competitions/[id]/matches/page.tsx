import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { fullName, weightClassLabel } from "@/lib/format";

export default async function AdminMatchesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: {
      matches: {
        orderBy: [{ weightClass: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          athlete1First: true, athlete1Last: true, athlete1Score: true, athlete1Club: true,
          athlete2First: true, athlete2Last: true, athlete2Score: true, athlete2Club: true,
          winnerSide: true, weightClass: true,
          category: { select: { code: true } },
        },
      },
    },
  });
  if (!competition) notFound();

  const tTabs = await getTranslations({ locale, namespace: "admin.tabs" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{tTabs("matches")}</h2>
        <span className="text-xs text-gray-500">
          Populated from JudoShiai SFTP ingest (planned). Read-only here for now.
        </span>
      </div>

      {competition.matches.length === 0 ? (
        <p className="text-sm text-gray-500">No matches yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-4 pr-3">Category</th>
                <th className="py-2.5 pr-3">Match</th>
                <th className="py-2.5 pr-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {competition.matches.map((m) => {
                const a1 = fullName(m.athlete1First, m.athlete1Last);
                const a2 = fullName(m.athlete2First, m.athlete2Last);
                return (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pl-4 pr-3 text-xs text-gray-500">
                      {[m.category?.code, weightClassLabel(m.weightClass)].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={m.winnerSide === 1 ? "font-semibold" : "text-gray-600"}>{a1}</span>
                      <span className="mx-2 text-gray-400">vs</span>
                      <span className={m.winnerSide === 2 ? "font-semibold" : "text-gray-600"}>{a2}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">
                      {m.athlete1Score != null && m.athlete2Score != null
                        ? `${m.athlete1Score}–${m.athlete2Score}`
                        : "—"}
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
