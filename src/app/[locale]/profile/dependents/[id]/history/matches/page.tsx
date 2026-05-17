import { requireTargetUser } from "@/lib/session";
import MatchesView from "@/components/profileHistory/MatchesView";

export default async function DependentMatchesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const target = await requireTargetUser(id, locale);
  return <MatchesView userId={target.id} locale={locale} />;
}
