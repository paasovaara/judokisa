import { requireTargetUser } from "@/lib/session";
import RegistrationsView from "@/components/profileHistory/RegistrationsView";

export default async function DependentRegistrationsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const target = await requireTargetUser(id, locale);
  return <RegistrationsView userId={target.id} locale={locale} />;
}
