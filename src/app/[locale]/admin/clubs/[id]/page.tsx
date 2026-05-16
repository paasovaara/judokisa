import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import ClubForm from "../ClubForm";
import { deleteClub, updateClub } from "../actions";

export default async function EditClubPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      _count: { select: { competitors: true, results: true, userProfiles: true } },
    },
  });
  if (!club) notFound();

  const t = await getTranslations({ locale, namespace: "admin.clubs" });
  const tForm = await getTranslations({ locale, namespace: "admin.clubs.form" });

  async function update(form: FormData) {
    "use server";
    await updateClub(locale, id, form);
  }
  async function deleteAction() {
    "use server";
    await deleteClub(locale, id);
  }

  const hasReferences = club._count.competitors > 0 || club._count.results > 0;

  return (
    <div>
      <Link
        href={`/${locale}/admin/clubs`}
        className="mb-4 inline-block text-sm text-primary-light hover:underline"
      >
        ← {t("title")}
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{club.displayName}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {t("members_count")}: {club._count.userProfiles}
        {" · "}
        {t("competitors_count")}: {club._count.competitors}
      </p>

      <ClubForm
        action={update}
        cancelHref={`/${locale}/admin/clubs`}
        defaults={{
          displayName: club.displayName,
          country: club.country,
          suomiSportName: club.suomiSportName,
        }}
        labels={{
          displayName: tForm("display_name"),
          country: tForm("country"),
          suomiSportName: tForm("suomi_sport_name"),
          save: t("save"),
          cancel: t("cancel"),
        }}
      />

      <form action={deleteAction} className="mt-12 rounded-xl border border-danger/30 bg-red-50/50 p-6">
        <h2 className="mb-2 text-sm font-semibold text-danger">{t("delete")}</h2>
        <p className="mb-4 text-sm text-gray-600">
          {hasReferences ? t("delete_blocked") : t("delete_confirm")}
        </p>
        <button
          type="submit"
          disabled={hasReferences}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("delete")}
        </button>
      </form>
    </div>
  );
}
