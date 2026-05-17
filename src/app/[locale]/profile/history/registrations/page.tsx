import { requireCurrentUser } from "@/lib/session";
import RegistrationsView from "@/components/profileHistory/RegistrationsView";

export default async function ProfileRegistrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  return <RegistrationsView userId={user.id} locale={locale} />;
}
