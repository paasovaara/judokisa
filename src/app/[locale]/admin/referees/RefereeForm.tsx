"use client";

import Link from "next/link";

interface FormDefaults {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  address?: string | null;
  club?: string | null;
  geographicArea?: string | null;
  judoGrade?: string | null;
  refereeLicenseLevel?: string | null;
  isReferee?: boolean;
  isAdministrator?: boolean;
  isCommission?: boolean;
  isCoordinator?: boolean;
  isCompetitionManager?: boolean;
  isCompetitionAssistant?: boolean;
  isCompetitionResponsible?: boolean;
  isCourseInstructor?: boolean;
  isJudoShiaiOperator?: boolean;
  isVideoOperator?: boolean;
  active?: boolean;
  blacklisted?: boolean;
  gdprNoSync?: boolean;
}

const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"];
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];
const LICENSES = ["D", "C", "B", "A", "INT_B", "INT_A"];

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

interface Props {
  defaults?: FormDefaults;
  action: (form: FormData) => void;
  cancelHref: string;
  saveLabel: string;
  cancelLabel: string;
}

const ROLE_FIELDS = [
  ["isReferee", "Referee"],
  ["isAdministrator", "Administrator"],
  ["isCommission", "Commission"],
  ["isCoordinator", "Coordinator"],
  ["isCompetitionManager", "Competition manager"],
  ["isCompetitionAssistant", "Competition assistant"],
  ["isCompetitionResponsible", "Competition responsible"],
  ["isCourseInstructor", "Course instructor"],
  ["isJudoShiaiOperator", "JudoShiai operator"],
  ["isVideoOperator", "Video operator"],
] as const;

export default function RefereeForm({ defaults = {}, action, cancelHref, saveLabel, cancelLabel }: Props) {
  return (
    <form action={action} className="space-y-6">
      {/* Identity */}
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>First name</label>
          <input name="firstName" required defaultValue={defaults.firstName ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Last name</label>
          <input name="lastName" required defaultValue={defaults.lastName ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" name="email" required defaultValue={defaults.email ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" defaultValue={defaults.phone ?? ""} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Address</label>
          <input name="address" defaultValue={defaults.address ?? ""} className={inputCls} />
        </div>
      </fieldset>

      {/* Affiliation */}
      <fieldset className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Club (free-text)</label>
          <input name="club" defaultValue={defaults.club ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Geographic area</label>
          <select name="geographicArea" defaultValue={defaults.geographicArea ?? ""} className={inputCls}>
            <option value="">—</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Judo grade</label>
          <select name="judoGrade" defaultValue={defaults.judoGrade ?? ""} className={inputCls}>
            <option value="">—</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Referee license</label>
          <select name="refereeLicenseLevel" defaultValue={defaults.refereeLicenseLevel ?? ""} className={inputCls}>
            <option value="">—</option>
            {LICENSES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </fieldset>

      {/* Roles */}
      <fieldset>
        <legend className={labelCls}>Roles</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_FIELDS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name={k} defaultChecked={defaults[k] ?? (k === "isReferee")} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Status flags */}
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="_inactive" defaultChecked={defaults.active === false} />
          Inactive
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="blacklisted" defaultChecked={defaults.blacklisted ?? false} />
          Blacklisted
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="gdprNoSync" defaultChecked={defaults.gdprNoSync ?? false} />
          GDPR no-sync
        </label>
      </fieldset>

      <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {saveLabel}
        </button>
        <Link href={cancelHref} className="text-sm text-gray-500 hover:text-gray-800">
          {cancelLabel}
        </Link>
      </div>
    </form>
  );
}
