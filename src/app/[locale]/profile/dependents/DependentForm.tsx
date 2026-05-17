"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { JudoGrade } from "@prisma/client";
import {
  DEFAULT_CATEGORIES,
  defaultCategoryByCode,
  allDefaultWeightClasses,
  formatWeightClass,
} from "@/lib/categories";
import { judoGradeEmoji, judoGradeLabel } from "@/lib/format";

interface FormDefaults {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  clubId?: string | null;
  geographicArea?: string | null;
  judoGrade?: string | null;
  profilePhoto?: string | null;
  defaultCategoryCode?: string | null;
  defaultWeightClass?: number | null;
  gdprNoSync?: boolean;
  relation?: string | null;
}

export interface ClubOption {
  id: string;
  displayName: string;
}

const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"];
const GRADES = ["K6","K5","K4","K3","K2","K1","D1","D2","D3","D4","D5","D6","D7","D8","D9","D10"];
const RELATIONS = ["PARENT", "LEGAL_GUARDIAN", "OTHER"] as const;

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";
const sectionTitleCls = "mb-3 text-sm font-semibold text-gray-700";

interface Labels {
  locale: string;
  sectionIdentity: string;
  sectionContact: string;
  sectionJudo: string;
  sectionDefaults: string;
  sectionPrivacy: string;
  firstName: string;
  lastName: string;
  relation: string;
  relationParent: string;
  relationLegalGuardian: string;
  relationOther: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  club: string;
  geographicArea: string;
  judoGrade: string;
  profilePhoto: string;
  profilePhotoHint: string;
  defaultCategoryCode: string;
  defaultWeightClass: string;
  gdprNoSync: string;
  gdprNoSyncHint: string;
  save: string;
  cancel: string;
}

interface Props {
  mode: "create" | "edit";
  defaults?: FormDefaults;
  clubs: ClubOption[];
  action: (form: FormData) => void;
  cancelHref: string;
  labels: Labels;
}

export default function DependentForm({
  mode,
  defaults = {},
  clubs,
  action,
  cancelHref,
  labels,
}: Props) {
  const [categoryCode, setCategoryCode] = useState<string>(defaults.defaultCategoryCode ?? "");
  const weightOptions = useMemo(() => {
    const cat = defaultCategoryByCode(categoryCode);
    return cat ? cat.weightClasses : allDefaultWeightClasses();
  }, [categoryCode]);

  const relationLabel = (r: string): string => {
    if (r === "PARENT") return labels.relationParent;
    if (r === "LEGAL_GUARDIAN") return labels.relationLegalGuardian;
    return labels.relationOther;
  };

  return (
    <form action={action} className="space-y-8">
      {/* Identity (name + relation) */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionIdentity}</h2>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{labels.firstName}</label>
            <input
              name="firstName"
              required
              defaultValue={defaults.firstName ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{labels.lastName}</label>
            <input
              name="lastName"
              required
              defaultValue={defaults.lastName ?? ""}
              className={inputCls}
            />
          </div>
          {mode === "create" && (
            <div className="sm:col-span-2">
              <label className={labelCls}>{labels.relation}</label>
              <select
                name="relation"
                defaultValue={defaults.relation ?? "PARENT"}
                className={inputCls}
              >
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {relationLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </fieldset>
      </section>

      {/* Contact */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionContact}</h2>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>{labels.phone}</label>
            <input name="phone" defaultValue={defaults.phone ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{labels.dateOfBirth}</label>
            <input
              type="date"
              name="dateOfBirth"
              defaultValue={defaults.dateOfBirth ?? ""}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>{labels.address}</label>
            <input name="address" defaultValue={defaults.address ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{labels.profilePhoto}</label>
            <input
              name="profilePhoto"
              defaultValue={defaults.profilePhoto ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
            <p className="mt-1 text-xs text-gray-400">{labels.profilePhotoHint}</p>
          </div>
        </fieldset>
      </section>

      {/* Judo */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionJudo}</h2>
        <fieldset className="grid gap-4 sm:grid-cols-3">
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
          <div>
            <label className={labelCls}>{labels.geographicArea}</label>
            <select
              name="geographicArea"
              defaultValue={defaults.geographicArea ?? ""}
              className={inputCls}
            >
              <option value="">—</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>{labels.judoGrade}</label>
            <select name="judoGrade" defaultValue={defaults.judoGrade ?? ""} className={inputCls}>
              <option value="">—</option>
              {GRADES.map((g) => {
                const emoji = judoGradeEmoji(g as JudoGrade);
                const text = judoGradeLabel(g as JudoGrade) ?? g;
                return (
                  <option key={g} value={g}>
                    {`${emoji} ${text}`.trim()}
                  </option>
                );
              })}
            </select>
          </div>
        </fieldset>
      </section>

      {/* Registration defaults */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionDefaults}</h2>
        <fieldset className="grid gap-4 sm:grid-cols-2">
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
              key={categoryCode}
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

      {/* Privacy */}
      <section>
        <h2 className={sectionTitleCls}>{labels.sectionPrivacy}</h2>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="gdprNoSync"
            defaultChecked={defaults.gdprNoSync ?? false}
            className="mt-0.5"
          />
          <span>
            {labels.gdprNoSync}
            <span className="block text-xs text-gray-400">{labels.gdprNoSyncHint}</span>
          </span>
        </label>
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
