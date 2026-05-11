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

export default async function ProfileOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireCurrentUser(locale);
  const t = await getTranslations({ locale, namespace: "profile" });

  const [resultsCount, matchesCount, refereeCount, registrationsCount] = await Promise.all([
    countUserResults(user.id),
    countUserMatches(user.id),
    countUserRefereeJobs(user.id),
    countUserRegistrations(user.id),
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
              {p.club ? ` · ${p.club}` : ""}
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
    </div>
  );
}
