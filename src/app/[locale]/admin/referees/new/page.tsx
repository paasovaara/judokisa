import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import RefereeForm from "../RefereeForm";
import { createReferee } from "../actions";

export default async function NewRefereePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.referees" });
  const tComp = await getTranslations({ locale, namespace: "admin.competitions" });
  const clubs = await prisma.club.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  async function action(form: FormData) {
    "use server";
    await createReferee(locale, form);
  }

  return (
    <div>
      <Link
        href={`/${locale}/admin/referees`}
        className="mb-4 inline-block text-sm text-primary-light hover:underline"
      >
        ← {t("title")}
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("new")}</h1>
      <RefereeForm
        action={action}
        cancelHref={`/${locale}/admin/referees`}
        saveLabel={tComp("save")}
        cancelLabel={tComp("cancel")}
        clubs={clubs}
      />
    </div>
  );
}
