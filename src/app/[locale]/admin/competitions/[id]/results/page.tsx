import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { fullName, weightClassLabel } from "@/lib/format";

export default async function AdminResultsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id },
    select: {
      results: {
        orderBy: [{ weightClass: "asc" }, { placement: "asc" }],
        select: {
          id: true, firstName: true, lastName: true, placement: true,
          weightClass: true, ageCategory: true, clubName: true,
          club: { select: { displayName: true } },
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
        <h2 className="text-lg font-semibold text-gray-900">{tTabs("results")}</h2>
        <span className="text-xs text-gray-500">
          Populated from JudoShiai SFTP ingest (planned). Read-only here for now.
        </span>
      </div>

      {competition.results.length === 0 ? (
        <p className="text-sm text-gray-500">No results yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2.5 pl-4 pr-3">Place</th>
                <th className="py-2.5 pr-3">Athlete</th>
                <th className="py-2.5 pr-3">Club</th>
                <th className="py-2.5 pr-3">Category</th>
                <th className="py-2.5 pr-4">Weight</th>
              </tr>
            </thead>
            <tbody>
              {competition.results.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-2.5 pl-4 pr-3 font-bold">{r.placement}.</td>
                  <td className="py-2.5 pr-3">{fullName(r.firstName, r.lastName)}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{r.club?.displayName ?? r.clubName ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{r.category?.code ?? r.ageCategory ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{weightClassLabel(r.weightClass) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
