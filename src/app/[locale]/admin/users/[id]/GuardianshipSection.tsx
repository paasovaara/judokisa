import { getTranslations } from "next-intl/server";
import type { GuardianshipRelation, GuardianshipStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";
import {
  adminLinkGuardianship,
  adminReactivateUser,
  adminRevokeGuardianship,
  adminRestoreGuardianship,
} from "../actions";

interface Row {
  guardianId: string;
  dependentId: string;
  relation: GuardianshipRelation;
  status: GuardianshipStatus;
  createdAt: Date;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  revokedAt: Date | null;
  revokedBy: { id: string; firstName: string; lastName: string } | null;
  // The "other side" — when listing dependents, this is the dependent user;
  // when listing guardians, the guardian user.
  other: { id: string; firstName: string; lastName: string };
}

interface Props {
  locale: string;
  centerUserId: string;
  profileActive: boolean;
}

const RELATIONS: GuardianshipRelation[] = ["PARENT", "LEGAL_GUARDIAN", "OTHER"];

export default async function GuardianshipSection({
  locale,
  centerUserId,
  profileActive,
}: Props) {
  const t = await getTranslations({ locale, namespace: "admin.users.guardianships" });

  // Pull both directions of the relationship for this user, including audit
  // info (createdBy, revokedBy). Includes REVOKED rows so admins can see
  // history and restore if needed.
  const [asGuardianRows, asDependentRows] = await Promise.all([
    prisma.guardianship.findMany({
      where: { guardianId: centerUserId },
      include: {
        dependent: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        revokedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.guardianship.findMany({
      where: { dependentId: centerUserId },
      include: {
        guardian: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        revokedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const dependents: Row[] = asGuardianRows.map((r) => ({
    guardianId: r.guardianId,
    dependentId: r.dependentId,
    relation: r.relation,
    status: r.status,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    revokedAt: r.revokedAt,
    revokedBy: r.revokedBy,
    other: r.dependent,
  }));
  const guardians: Row[] = asDependentRows.map((r) => ({
    guardianId: r.guardianId,
    dependentId: r.dependentId,
    relation: r.relation,
    status: r.status,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    revokedAt: r.revokedAt,
    revokedBy: r.revokedBy,
    other: r.guardian,
  }));

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const linkAction = adminLinkGuardianship.bind(null, locale, centerUserId);
  const revokeAction = adminRevokeGuardianship.bind(null, locale, centerUserId);
  const restoreAction = adminRestoreGuardianship.bind(null, locale, centerUserId);
  const reactivateAction = adminReactivateUser.bind(null, locale, centerUserId);

  const relationLabel = (r: GuardianshipRelation): string => {
    if (r === "PARENT") return t("relation_parent");
    if (r === "LEGAL_GUARDIAN") return t("relation_legal_guardian");
    return t("relation_other");
  };

  return (
    <section className="mt-12 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">{t("section_title")}</h2>
      <p className="mb-6 text-sm text-gray-600">{t("section_hint")}</p>

      {/* Dependents of this user */}
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{t("dependents_title")}</h3>
      {dependents.length === 0 ? (
        <p className="mb-6 text-sm text-gray-500">{t("dependents_empty")}</p>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2 pl-3 pr-3">{t("col_user")}</th>
                <th className="py-2 pr-3">{t("col_relation")}</th>
                <th className="py-2 pr-3">{t("col_status")}</th>
                <th className="py-2 pr-3">{t("col_created")}</th>
                <th className="py-2 pr-3">{t("col_revoked")}</th>
                <th className="py-2 pr-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {dependents.map((row) => (
                <RowView
                  key={`${row.guardianId}-${row.dependentId}`}
                  row={row}
                  locale={locale}
                  fmt={fmt}
                  t={t}
                  relationLabel={relationLabel}
                  revokeAction={revokeAction}
                  restoreAction={restoreAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Guardians of this user */}
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{t("guardians_title")}</h3>
      {guardians.length === 0 ? (
        <p className="mb-6 text-sm text-gray-500">{t("guardians_empty")}</p>
      ) : (
        <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="py-2 pl-3 pr-3">{t("col_user")}</th>
                <th className="py-2 pr-3">{t("col_relation")}</th>
                <th className="py-2 pr-3">{t("col_status")}</th>
                <th className="py-2 pr-3">{t("col_created")}</th>
                <th className="py-2 pr-3">{t("col_revoked")}</th>
                <th className="py-2 pr-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((row) => (
                <RowView
                  key={`${row.guardianId}-${row.dependentId}`}
                  row={row}
                  locale={locale}
                  fmt={fmt}
                  t={t}
                  relationLabel={relationLabel}
                  revokeAction={revokeAction}
                  restoreAction={restoreAction}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link forms — keyed by role so the same server action handles both. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <LinkForm
          title={t("link_dependent_title")}
          role="addDependent"
          action={linkAction}
          t={t}
        />
        <LinkForm
          title={t("link_guardian_title")}
          role="addGuardian"
          action={linkAction}
          t={t}
        />
      </div>

      {/* Reactivate panel — only shown when the profile is currently inactive. */}
      {!profileActive && (
        <form action={reactivateAction} className="mt-8 rounded-lg border border-warning/30 bg-yellow-50 p-4">
          <h3 className="mb-1 text-sm font-semibold text-gray-800">{t("reactivate_section_title")}</h3>
          <p className="mb-3 text-sm text-gray-700">{t("reactivate_hint")}</p>
          <button
            type="submit"
            className="rounded-lg bg-warning px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("reactivate_button")}
          </button>
        </form>
      )}
    </section>
  );
}

type Translator = Awaited<ReturnType<typeof getTranslations<"admin.users.guardianships">>>;

function RowView({
  row,
  locale,
  fmt,
  t,
  relationLabel,
  revokeAction,
  restoreAction,
}: {
  row: Row;
  locale: string;
  fmt: Intl.DateTimeFormat;
  t: Translator;
  relationLabel: (r: GuardianshipRelation) => string;
  revokeAction: (form: FormData) => void;
  restoreAction: (form: FormData) => void;
}) {
  const isActive = row.status === "ACTIVE";
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pl-3 pr-3">
        <a
          href={`/${locale}/admin/users/${row.other.id}`}
          className="text-primary-light hover:underline"
        >
          {fullName(row.other.firstName, row.other.lastName)}
        </a>
      </td>
      <td className="py-2 pr-3 text-gray-600">{relationLabel(row.relation)}</td>
      <td className="py-2 pr-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive ? "bg-green-100 text-success" : "bg-gray-100 text-gray-500"
          }`}
        >
          {isActive ? t("status_active") : t("status_revoked")}
        </span>
      </td>
      <td className="py-2 pr-3 text-xs text-gray-500">
        {fmt.format(row.createdAt)}
        {row.createdBy && (
          <span className="ml-1 text-gray-400">
            {t("by")} {fullName(row.createdBy.firstName, row.createdBy.lastName)}
          </span>
        )}
      </td>
      <td className="py-2 pr-3 text-xs text-gray-500">
        {row.revokedAt ? fmt.format(row.revokedAt) : "—"}
        {row.revokedBy && (
          <span className="ml-1 text-gray-400">
            {t("by")} {fullName(row.revokedBy.firstName, row.revokedBy.lastName)}
          </span>
        )}
      </td>
      <td className="py-2 pr-3 text-right">
        {isActive ? (
          <form action={revokeAction} className="inline">
            <input type="hidden" name="guardianId" value={row.guardianId} />
            <input type="hidden" name="dependentId" value={row.dependentId} />
            <button
              type="submit"
              className="rounded border border-danger px-2 py-1 text-xs font-medium text-danger hover:bg-danger/5"
            >
              {t("revoke")}
            </button>
          </form>
        ) : (
          <form action={restoreAction} className="inline">
            <input type="hidden" name="guardianId" value={row.guardianId} />
            <input type="hidden" name="dependentId" value={row.dependentId} />
            <button
              type="submit"
              className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("restore")}
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

function LinkForm({
  title,
  role,
  action,
  t,
}: {
  title: string;
  role: "addGuardian" | "addDependent";
  action: (form: FormData) => void;
  t: Translator;
}) {
  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
  const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";
  return (
    <form action={action} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-1 text-sm font-semibold text-gray-800">{title}</h3>
      <p className="mb-3 text-xs text-gray-500">{t("link_hint")}</p>
      <input type="hidden" name="role" value={role} />
      <div className="space-y-3">
        <div>
          <label className={labelCls}>{t("other_user_id")}</label>
          <input name="otherUserId" required className={inputCls} placeholder="cuid…" />
        </div>
        <div>
          <label className={labelCls}>{t("relation")}</label>
          <select name="relation" defaultValue="PARENT" className={inputCls}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {r === "PARENT"
                  ? t("relation_parent")
                  : r === "LEGAL_GUARDIAN"
                    ? t("relation_legal_guardian")
                    : t("relation_other")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {t("link_button")}
        </button>
      </div>
    </form>
  );
}
