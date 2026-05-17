import { requireCurrentUser } from "@/lib/session";
import ResultsView from "@/components/profileHistory/ResultsView";

export default async function ProfileHistoryResultsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  return <ResultsView userId={user.id} locale={locale} />;
}
