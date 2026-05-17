import { requireTargetUser } from "@/lib/session";
import ResultsView from "@/components/profileHistory/ResultsView";

export default async function DependentResultsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const target = await requireTargetUser(id, locale);
  return <ResultsView userId={target.id} locale={locale} />;
}
