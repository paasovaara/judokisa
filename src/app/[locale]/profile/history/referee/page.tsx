import { requireCurrentUser } from "@/lib/session";
import RefereeView from "@/components/profileHistory/RefereeView";

export default async function ProfileRefereePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  return <RefereeView userId={user.id} locale={locale} />;
}
