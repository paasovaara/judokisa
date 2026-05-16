"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  DEFAULT_CATEGORIES,
  defaultCategoryByCode,
  allDefaultWeightClasses,
  formatWeightClass,
} from "@/lib/categories";

interface FormDefaults {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  clubId?: string | null;
  geographicArea?: string | null;
  judoGrade?: string | null;
  refereeLicenseLevel?: string | null;
  suomiSportInternalId?: number | null;
  suomiSportPersonId?: number | null;
  defaultCategoryCode?: string | null;
  defaultWeightClass?: number | null;
  isAdministrator?: boolean;
  isCommission?: boolean;
  isCoordinator?: boolean;
  isCompetitionManager?: boolean;
  isCompetitionAssistant?: boolean;
  isCompetitionResponsible?: boolean;
  isCourseInstructor?: boolean;
  isReferee?: boolean;
  isJudoShiaiOperator?: boolean;
  isVideoOperator?: boolean;
  active?: boolean;
  blacklisted?: boolean;
  gdprNoSync?: boolean;
}

const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"];
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];
const LICENSES = ["D", "C", "B", "A", "INT_B", "INT_A"];

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";
const sectionTitleCls = "mb-3 text-sm font-semibold text-gray-700";

interface Labels {
  locale: string;
  sectionIdentity: string;
  sectionProfile: string;
  sectionRoles: string;
  sectionStatus: string;
  sectionSuomiSport: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  club: string;
  geographicArea: string;
  judoGrade: string;
  refereeLicense: string;
  defaultCategoryCode: string;
  defaultWeightClass: string;
  suomiSportInternalId: string;
  suomiSportPersonId: string;
  inactive: string;
  blacklisted: string;
  gdprNoSync: string;
  roles: Record<string, string>;
  save: string;
  cancel: string;
}

export interface ClubOption {
  id: string;
  displayName: string;
}

interface Props {
  defaults?: FormDefaults;
  clubs: ClubOption[];
  action: (form: FormData) => void;
  cancelHref: string;
  labels: Labels;
}

const ROLE_FIELDS = [
  "isAdministrator",
  "isCommission",
  "isCoordinator",
  "isCompetitionManager",
  "isCompetitionAssistant",
  "isCompetitionResponsible",
  "isCourseInstructor",
  "isReferee",
  "isJudoShiaiOperator",
  "isVideoOperator",
] as const;

type RoleField = (typeof ROLE_FIELDS)[number];

export default function UserForm({ defaults = {}, clubs, action, cancelHref, labels }: Props) {
  const [categoryCode, setCategoryCode] = useState<string>(defaults.defaultCategoryCode ?? "");
  const weightOptions = useMemo(() => {
    const cat = defaultCategoryByCode(categoryCode);
    return cat ? cat.weightClasses : allDefaultWeightClasses();
  }, [categoryCode]);

  return (
    <form action={action} className="space-y-8">
      {/* Identity */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionIdentity}</h2>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>{labels.firstName}</label>
            <input name="firstName" required defaultValue={defaults.firstName ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{labels.lastName}</label>
            <input name="lastName" required defaultValue={defaults.lastName ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{labels.email}</label>
            <input type="email" name="email" required defaultValue={defaults.email ?? ""} className={inputCls} />
          </div>
        </fieldset>
      </section>

      {/* Roles */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionRoles}</h2>
        <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_FIELDS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name={k} defaultChecked={defaults[k] ?? false} />
              {labels.roles[k]}
            </label>
          ))}
        </fieldset>
      </section>

      {/* Profile */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionProfile}</h2>
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>{labels.phone}</label>
            <input name="phone" defaultValue={defaults.phone ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{labels.dateOfBirth}</label>
            <input type="date" name="dateOfBirth" defaultValue={defaults.dateOfBirth ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{labels.club}</label>
            <select name="clubId" defaultValue={defaults.clubId ?? ""} className={inputCls}>
              <option value="">—</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className={labelCls}>{labels.address}</label>
            <input name="address" defaultValue={defaults.address ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{labels.geographicArea}</label>
            <select name="geographicArea" defaultValue={defaults.geographicArea ?? ""} className={inputCls}>
              <option value="">—</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{labels.judoGrade}</label>
            <select name="judoGrade" defaultValue={defaults.judoGrade ?? ""} className={inputCls}>
              <option value="">—</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{labels.refereeLicense}</label>
            <select name="refereeLicenseLevel" defaultValue={defaults.refereeLicenseLevel ?? ""} className={inputCls}>
              <option value="">—</option>
              {LICENSES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{labels.defaultCategoryCode}</label>
            <select
              name="defaultCategoryCode"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {labels.locale === "fi" ? c.nameFi : c.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{labels.defaultWeightClass}</label>
            <select
              name="defaultWeightClass"
              defaultValue={defaults.defaultWeightClass ?? ""}
              className={inputCls}
              key={categoryCode /* reset selection when category changes */}
            >
              <option value="">—</option>
              {weightOptions.map((w) => (
                <option key={w} value={w}>
                  {formatWeightClass(w)}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      </section>

      {/* SuomiSport */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionSuomiSport}</h2>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{labels.suomiSportInternalId}</label>
            <input
              type="number"
              name="suomiSportInternalId"
              defaultValue={defaults.suomiSportInternalId ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{labels.suomiSportPersonId}</label>
            <input
              type="number"
              name="suomiSportPersonId"
              defaultValue={defaults.suomiSportPersonId ?? ""}
              className={inputCls}
            />
          </div>
        </fieldset>
      </section>

      {/* Status flags */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionStatus}</h2>
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="_inactive" defaultChecked={defaults.active === false} />
            {labels.inactive}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="blacklisted" defaultChecked={defaults.blacklisted ?? false} />
            {labels.blacklisted}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="gdprNoSync" defaultChecked={defaults.gdprNoSync ?? false} />
            {labels.gdprNoSync}
          </label>
        </fieldset>
      </section>

      <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {labels.save}
        </button>
        <Link href={cancelHref} className="text-sm text-gray-500 hover:text-gray-800">
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}

export type { RoleField };
