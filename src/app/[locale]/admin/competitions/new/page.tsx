import Link from "next/link";
import { getTranslations } from "next-intl/server";
import CompetitionForm from "../CompetitionForm";
import { createCompetition } from "../actions";

export default async function NewCompetitionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.competitions" });
  const tForm = await getTranslations({ locale, namespace: "admin.competitions.form" });

  async function action(form: FormData) {
    "use server";
    await createCompetition(locale, form);
  }

  return (
    <div>
      <Link
        href={`/${locale}/admin/competitions`}
        className="mb-4 inline-block text-sm text-primary-light hover:underline"
      >
        ← {t("title")}
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("new")}</h1>

      <CompetitionForm
        action={action}
        cancelHref={`/${locale}/admin/competitions`}
        labels={{
          name: tForm("name"),
          slug: tForm("slug"),
          type: tForm("type"),
          level: tForm("level"),
          status: tForm("status"),
          registrationOpen: tForm("registration_open"),
          dateStart: tForm("date_start"),
          dateEnd: tForm("date_end"),
          registrationDeadline: tForm("registration_deadline"),
          city: tForm("city"),
          venue: tForm("venue"),
          address: tForm("address"),
          country: tForm("country"),
          geographicArea: tForm("geographic_area"),
          capacity: tForm("capacity"),
          tatamiCount: tForm("tatami_count"),
          targetRefereeCount: tForm("target_referee_count"),
          matchDuration: tForm("match_duration"),
          useCustomVideoHtml: tForm("use_custom_video_html"),
          description: tForm("description"),
          registrationUrl: tForm("registration_url"),
          infoUrl: tForm("info_url"),
          resultsUrl: tForm("results_url"),
          save: t("save"),
          cancel: t("cancel"),
        }}
      />
    </div>
  );
}
