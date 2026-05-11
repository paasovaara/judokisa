import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ClubForm from "../ClubForm";
import { createClub } from "../actions";

export default async function NewClubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.clubs" });
  const tForm = await getTranslations({ locale, namespace: "admin.clubs.form" });

  async function action(form: FormData) {
    "use server";
    await createClub(locale, form);
  }

  return (
    <div>
      <Link
        href={`/${locale}/admin/clubs`}
        className="mb-4 inline-block text-sm text-primary-light hover:underline"
      >
        ← {t("title")}
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("new")}</h1>

      <ClubForm
        action={action}
        cancelHref={`/${locale}/admin/clubs`}
        labels={{
          displayName: tForm("display_name"),
          country: tForm("country"),
          suomiSportName: tForm("suomi_sport_name"),
          save: t("save"),
          cancel: t("cancel"),
        }}
      />
    </div>
  );
}
