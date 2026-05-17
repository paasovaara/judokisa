import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireCurrentUser } from "@/lib/session";
import { fullName, judoGradeLabel, judoGradeEmoji } from "@/lib/format";
import { ROLE_KEYS, ROLE_BADGE_LABEL, type RoleKey } from "@/app/[locale]/admin/users/roles";
import {
  countUserResults,
  countUserMatches,
  countUserRefereeJobs,
  countUserRegistrations,
} from "@/lib/profileHistory";
import { getDependents, getGuardians } from "@/lib/guardianship";

export default async function ProfileOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  const t = await getTranslations({ locale, namespace: "profile" });
  const tFamily = await getTranslations({ locale, namespace: "profile.family" });

  const [resultsCount, matchesCount, refereeCount, registrationsCount, dependents, guardiansOfMe] =
    await Promise.all([
      countUserResults(user.id),
      countUserMatches(user.id),
      countUserRefereeJobs(user.id),
      countUserRegistrations(user.id),
      getDependents(user.id),
      getGuardians(user.id),
    ]);

  const p = user.profile;
  const roles: RoleKey[] = p ? ROLE_KEYS.filter((k) => p[k]) : [];

  const stats = [
    { label: t("stat_results"),       value: resultsCount,        href: `/${locale}/profile/history` },
    { label: t("stat_matches"),       value: matchesCount,        href: `/${locale}/profile/history/matches` },
    { label: t("stat_referee_jobs"),  value: refereeCount,        href: `/${locale}/profile/history/referee` },
    { label: t("stat_registrations"), value: registrationsCount,  href: `/${locale}/profile/history/registrations` },
  ];

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
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("greeting", { name: user.firstName })}
          </h1>
          <p className="text-sm text-gray-600">{fullName(user.firstName, user.lastName)} · {user.email}</p>
          {p?.judoGrade && (
            <p className="mt-1 text-sm text-gray-600">
              {judoGradeEmoji(p.judoGrade)} {judoGradeLabel(p.judoGrade)}
              {p.club ? ` · ${p.club.displayName}` : ""}
            </p>
          )}
        </div>
      </div>

      {roles.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t("roles_label")}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((k) => (
              <span
                key={k}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {ROLE_BADGE_LABEL[k]}
              </span>
            ))}
          </div>
        </div>
      )}

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

      <div className="flex gap-3">
        <Link
          href={`/${locale}/profile/edit`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("edit_profile")}
        </Link>
        <Link
          href={`/${locale}/profile/history`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("view_history")}
        </Link>
      </div>

      {/* My family — children / dependents the parent guardians. Always shows
          the "+ Add child" CTA, even with no dependents yet. */}
      <section className="mt-10 border-t border-gray-200 pt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{tFamily("title")}</h2>
          <Link
            href={`/${locale}/profile/dependents/new`}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {tFamily("add_child_button")}
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-600">{tFamily("intro")}</p>

        {dependents.length === 0 ? (
          <p className="text-sm text-gray-500">{tFamily("empty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dependents.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/${locale}/profile/dependents/${d.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-primary"
                >
                  {d.profile?.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.profile.profilePhoto}
                      alt=""
                      className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {d.firstName.charAt(0)}
                      {d.lastName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">
                      {fullName(d.firstName, d.lastName)}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {d.profile?.judoGrade
                        ? `${judoGradeEmoji(d.profile.judoGrade)} ${
                            judoGradeLabel(d.profile.judoGrade) ?? d.profile.judoGrade
                          }`
                        : tFamily("card_no_grade")}
                      {d.profile?.club ? ` · ${d.profile.club.displayName}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Informational: who can act on my data. Read-only — dependents cannot
          reach into their guardian's profile (deliberate asymmetry). */}
      {guardiansOfMe.length > 0 && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {tFamily("managed_by")}
          </h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {guardiansOfMe.map((g) => (
              <li key={g.guardian.id}>
                {fullName(g.guardian.firstName, g.guardian.lastName)}
                <span className="ml-2 text-xs text-gray-400">{g.relation}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
