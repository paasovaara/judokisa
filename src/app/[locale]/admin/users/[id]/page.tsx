import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import UserForm from "../UserForm";
import { deleteUser, updateUser } from "../actions";
import { buildUserFormLabels } from "../labels";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      _count: {
        select: {
          responsibleForCompetitions: true,
          managedCompetitions: true,
          assistedCompetitions: true,
          judoShiaiCompetitions: true,
          videoOperatedCompetitions: true,
          registeredCompetitors: true,
          refereeInvitations: true,
        },
      },
    },
  });
  if (!user) notFound();

  const t = await getTranslations({ locale, namespace: "admin.users" });
  const labels = await buildUserFormLabels(locale);
  const clubs = await prisma.club.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  async function update(form: FormData) {
    "use server";
    await updateUser(locale, id, form);
  }
  async function deleteAction() {
    "use server";
    await deleteUser(locale, id);
  }

  const refs =
    user._count.responsibleForCompetitions +
    user._count.managedCompetitions +
    user._count.assistedCompetitions +
    user._count.judoShiaiCompetitions +
    user._count.videoOperatedCompetitions +
    user._count.registeredCompetitors;
  const hasBlockingRefs = refs > 0;

  const dob = user.profile?.dateOfBirth
    ? user.profile.dateOfBirth.toISOString().slice(0, 10)
    : null;

  return (
    <div>
      <Link
        href={`/${locale}/admin/users`}
        className="mb-4 inline-block text-sm text-primary-light hover:underline"
      >
        ← {t("title")}
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        {user.firstName} {user.lastName}
      </h1>
      <p className="mb-6 text-sm text-gray-500">{user.email}</p>

      <UserForm
        action={update}
        cancelHref={`/${locale}/admin/users`}
        labels={labels}
        clubs={clubs}
        defaults={{
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.profile?.phone ?? null,
          dateOfBirth: dob,
          address: user.profile?.address ?? null,
          clubId: user.profile?.clubId ?? null,
          geographicArea: user.profile?.geographicArea ?? null,
          judoGrade: user.profile?.judoGrade ?? null,
          refereeLicenseLevel: user.profile?.refereeLicenseLevel ?? null,
          suomiSportInternalId: user.profile?.suomiSportInternalId ?? null,
          suomiSportPersonId: user.profile?.suomiSportPersonId ?? null,
          defaultCategoryCode: user.profile?.defaultCategoryCode ?? null,
          defaultWeightClass: user.profile?.defaultWeightClass ?? null,
          isAdministrator: user.profile?.isAdministrator ?? false,
          isCommission: user.profile?.isCommission ?? false,
          isCoordinator: user.profile?.isCoordinator ?? false,
          isCompetitionManager: user.profile?.isCompetitionManager ?? false,
          isCompetitionAssistant: user.profile?.isCompetitionAssistant ?? false,
          isCompetitionResponsible: user.profile?.isCompetitionResponsible ?? false,
          isCourseInstructor: user.profile?.isCourseInstructor ?? false,
          isReferee: user.profile?.isReferee ?? false,
          isJudoShiaiOperator: user.profile?.isJudoShiaiOperator ?? false,
          isVideoOperator: user.profile?.isVideoOperator ?? false,
          active: user.profile?.active ?? true,
          blacklisted: user.profile?.blacklisted ?? false,
          gdprNoSync: user.profile?.gdprNoSync ?? false,
        }}
      />

      <form action={deleteAction} className="mt-12 rounded-xl border border-danger/30 bg-red-50/50 p-6">
        <h2 className="mb-2 text-sm font-semibold text-danger">{t("delete")}</h2>
        <p className="mb-4 text-sm text-gray-600">
          {hasBlockingRefs ? t("delete_blocked") : t("delete_confirm")}
        </p>
        <button
          type="submit"
          disabled={hasBlockingRefs}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("delete")}
        </button>
      </form>
    </div>
  );
}
