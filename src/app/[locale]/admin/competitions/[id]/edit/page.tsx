import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import CompetitionForm from "../../CompetitionForm";
import { updateCompetition } from "../../actions";

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const competition = await prisma.competition.findUnique({ where: { id } });
  if (!competition) notFound();

  const t = await getTranslations({ locale, namespace: "admin.competitions" });
  const tForm = await getTranslations({ locale, namespace: "admin.competitions.form" });

  async function action(form: FormData) {
    "use server";
    await updateCompetition(locale, id, form);
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">{t("edit")}</h2>
      <CompetitionForm
        action={action}
        cancelHref={`/${locale}/admin/competitions/${id}`}
        defaults={{
          name: competition.name,
          slug: competition.slug,
          type: competition.type,
          level: competition.level,
          status: competition.status,
          registrationOpen: competition.registrationOpen,
          dateStart: dateInputValue(competition.dateStart),
          dateEnd: dateInputValue(competition.dateEnd),
          registrationDeadline: dateInputValue(competition.registrationDeadline),
          city: competition.city,
          venue: competition.venue,
          address: competition.address,
          country: competition.country,
          geographicArea: competition.geographicArea,
          capacity: competition.capacity,
          numberOfTatamiMats: competition.numberOfTatamiMats,
          targetRefereeCount: competition.targetRefereeCount,
          matchDurationMinutes: competition.matchDurationMinutes,
          useCustomVideoHtml: competition.useCustomVideoHtml,
          description: competition.description,
          registrationUrl: competition.registrationUrl,
          infoUrl: competition.infoUrl,
          resultsUrl: competition.resultsUrl,
        }}
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
