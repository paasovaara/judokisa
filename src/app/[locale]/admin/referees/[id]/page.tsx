import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import RefereeForm from "../RefereeForm";
import { deleteReferee, updateReferee } from "../actions";

export default async function EditRefereePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!user) notFound();

  const t = await getTranslations({ locale, namespace: "admin.referees" });
  const tComp = await getTranslations({ locale, namespace: "admin.competitions" });

  async function update(form: FormData) {
    "use server";
    await updateReferee(locale, id, form);
  }
  async function deleteAction() {
    "use server";
    await deleteReferee(locale, id);
  }

  return (
    <div>
      <Link
        href={`/${locale}/admin/referees`}
        className="mb-4 inline-block text-sm text-primary-light hover:underline"
      >
        ← {t("title")}
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {user.firstName} {user.lastName}
      </h1>

      <RefereeForm
        action={update}
        cancelHref={`/${locale}/admin/referees`}
        saveLabel={tComp("save")}
        cancelLabel={tComp("cancel")}
        defaults={{
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.profile?.phone ?? null,
          address: user.profile?.address ?? null,
          club: user.profile?.club ?? null,
          geographicArea: user.profile?.geographicArea ?? null,
          judoGrade: user.profile?.judoGrade ?? null,
          refereeLicenseLevel: user.profile?.refereeLicenseLevel ?? null,
          isReferee: user.profile?.isReferee ?? true,
          isAdministrator: user.profile?.isAdministrator ?? false,
          isCommission: user.profile?.isCommission ?? false,
          isCoordinator: user.profile?.isCoordinator ?? false,
          isCompetitionManager: user.profile?.isCompetitionManager ?? false,
          isCompetitionAssistant: user.profile?.isCompetitionAssistant ?? false,
          isCompetitionResponsible: user.profile?.isCompetitionResponsible ?? false,
          isCourseInstructor: user.profile?.isCourseInstructor ?? false,
          isJudoShiaiOperator: user.profile?.isJudoShiaiOperator ?? false,
          isVideoOperator: user.profile?.isVideoOperator ?? false,
          active: user.profile?.active ?? true,
          blacklisted: user.profile?.blacklisted ?? false,
          gdprNoSync: user.profile?.gdprNoSync ?? false,
        }}
      />

      <form action={deleteAction} className="mt-12 rounded-xl border border-danger/30 bg-red-50/50 p-6">
        <h2 className="mb-2 text-sm font-semibold text-danger">{tComp("delete")}</h2>
        <p className="mb-4 text-sm text-gray-600">
          Permanently delete this user. Their referee invitations will also be removed.
        </p>
        <button
          type="submit"
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {tComp("delete")}
        </button>
      </form>
    </div>
  );
}
