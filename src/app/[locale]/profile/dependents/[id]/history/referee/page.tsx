import { requireTargetUser } from "@/lib/session";
import RefereeView from "@/components/profileHistory/RefereeView";

export default async function DependentRefereePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const target = await requireTargetUser(id, locale);
  return <RefereeView userId={target.id} locale={locale} />;
}
