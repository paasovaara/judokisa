import { requireCurrentUser } from "@/lib/session";
import MatchesView from "@/components/profileHistory/MatchesView";

export default async function ProfileMatchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  return <MatchesView userId={user.id} locale={locale} />;
}
