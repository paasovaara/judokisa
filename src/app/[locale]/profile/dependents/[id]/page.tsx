import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCurrentUser, requireTargetUser } from "@/lib/session";
import { fullName, judoGradeLabel, judoGradeEmoji } from "@/lib/format";
import { countActiveGuardiansOf, getGuardians } from "@/lib/guardianship";
import { prisma } from "@/lib/db";
import {
  countUserResults,
  countUserMatches,
  countUserRefereeJobs,
  countUserRegistrations,
} from "@/lib/profileHistory";
import { softDeleteDependent, restoreDependent } from "../actions";

export default async function DependentOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const me = await requireCurrentUser(locale);
  const target = await requireTargetUser(id, locale);
  const t = await getTranslations({ locale, namespace: "profile" });
  const tRemove = await getTranslations({ locale, namespace: "profile.dependents.remove" });

  const [resultsCount, matchesCount, refereeCount, registrationsCount, guardiansTotal, myLink] =
    await Promise.all([
      countUserResults(target.id),
      countUserMatches(target.id),
      countUserRefereeJobs(target.id),
      countUserRegistrations(target.id),
      countActiveGuardiansOf(target.id),
      prisma.guardianship.findUnique({
        where: { guardianId_dependentId: { guardianId: me.id, dependentId: target.id } },
        select: { status: true, revokedById: true },
      }),
    ]);

  const p = target.profile;
  const isDependentOnly = target.authUserId === null;
  const iAmActiveGuardian = myLink?.status === "ACTIVE";
  const iAmSoleGuardian = iAmActiveGuardian && guardiansTotal === 1;
  const iAmRevokedByMyself =
    myLink?.status === "REVOKED" && (myLink.revokedById === null || myLink.revokedById === me.id);

  const stats = [
    {
      label: t("stat_results"),
      value: resultsCount,
      href: `/${locale}/profile/dependents/${target.id}/history`,
    },
    {
      label: t("stat_matches"),
      value: matchesCount,
      href: `/${locale}/profile/dependents/${target.id}/history/matches`,
    },
    {
      label: t("stat_referee_jobs"),
      value: refereeCount,
      href: `/${locale}/profile/dependents/${target.id}/history/referee`,
    },
    {
      label: t("stat_registrations"),
      value: registrationsCount,
      href: `/${locale}/profile/dependents/${target.id}/history/registrations`,
    },
  ];

  // Pre-bind the action so the form just submits.
  const removeAction = softDeleteDependent.bind(null, locale, target.id);
  const restoreAction = restoreDependent.bind(null, locale, target.id);

  const guardians = await getGuardians(target.id);

  return (
    <div>
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        {p?.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.profilePhoto}
            alt=""
            className="h-20 w-20 rounded-full border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {target.firstName.charAt(0)}
            {target.lastName.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {fullName(target.firstName, target.lastName)}
          </h1>
          {p?.judoGrade && (
            <p className="mt-1 text-sm text-gray-600">
              {judoGradeEmoji(p.judoGrade)} {judoGradeLabel(p.judoGrade)}
              {p.club ? ` · ${p.club.displayName}` : ""}
            </p>
          )}
          {p && !p.active && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-warning">
              Inactive
            </p>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary"
          >
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Link
          href={`/${locale}/profile/dependents/${target.id}/edit`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("edit_profile")}
        </Link>

        {iAmActiveGuardian && isDependentOnly && (
          <form action={removeAction}>
            <button
              type="submit"
              className="rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5"
              title={
                iAmSoleGuardian
                  ? tRemove("body_sole_guardian", { name: fullName(target.firstName, target.lastName) })
                  : tRemove("body_other_guardians", { name: fullName(target.firstName, target.lastName) })
              }
            >
              {tRemove("button")}
            </button>
          </form>
        )}

        {iAmActiveGuardian && !isDependentOnly && (
          <p className="text-xs text-gray-500">{tRemove("blocked_logged_in")}</p>
        )}

        {iAmRevokedByMyself && (
          <form action={restoreAction}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {tRemove("restore_button")}
            </button>
          </form>
        )}
      </div>

      {guardians.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {(await getTranslations({ locale, namespace: "profile.family" }))("managed_by")}
          </h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {guardians.map((g) => (
              <li key={g.guardian.id}>
                {fullName(g.guardian.firstName, g.guardian.lastName)}
                <span className="ml-2 text-xs text-gray-400">{g.relation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
