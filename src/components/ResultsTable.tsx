import { useTranslations } from "next-intl";
import { fullName } from "@/lib/format";

interface ResultRow {
  id: string;
  placement: number;
  firstName: string;
  lastName: string;
  clubName?: string | null;
}

interface ResultsTableProps {
  results: ResultRow[];
}

const placementStyle: Record<number, string> = {
  1: "text-yellow-600 font-bold",
  2: "text-gray-400 font-bold",
  3: "text-amber-700 font-bold",
};

export default function ResultsTable({ results }: ResultsTableProps) {
  const t = useTranslations("competition");

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="py-2 pr-4">{t("placement")}</th>
            <th className="py-2 pr-4">{t("athlete")}</th>
            <th className="py-2">{t("club")}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 last:border-0">
              <td className={`py-2.5 pr-4 ${placementStyle[r.placement] ?? "text-gray-700"}`}>
                {r.placement}.
              </td>
              <td className="py-2.5 pr-4 font-medium text-gray-900">
                {fullName(r.firstName, r.lastName)}
              </td>
              <td className="py-2.5 text-gray-500">{r.clubName ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
