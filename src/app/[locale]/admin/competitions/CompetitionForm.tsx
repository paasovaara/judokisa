"use client";

import Link from "next/link";

interface FormDefaults {
  name?: string;
  slug?: string;
  type?: string;
  level?: string | null;
  status?: string;
  registrationOpen?: boolean;
  dateStart?: string;        // YYYY-MM-DD
  dateEnd?: string;
  registrationDeadline?: string | null;
  city?: string;
  venue?: string | null;
  address?: string | null;
  country?: string;
  geographicArea?: string | null;
  capacity?: number | null;
  numberOfTatamiMats?: number;
  targetRefereeCount?: number;
  matchDurationMinutes?: number;
  useCustomVideoHtml?: boolean;
  description?: string | null;
  registrationUrl?: string | null;
  infoUrl?: string | null;
  resultsUrl?: string | null;
}

interface Props {
  defaults?: FormDefaults;
  action: (formData: FormData) => void;
  cancelHref: string;
  labels: {
    name: string;
    slug: string;
    type: string;
    level: string;
    status: string;
    registrationOpen: string;
    dateStart: string;
    dateEnd: string;
    registrationDeadline: string;
    city: string;
    venue: string;
    address: string;
    country: string;
    geographicArea: string;
    capacity: string;
    tatamiCount: string;
    targetRefereeCount: string;
    matchDuration: string;
    useCustomVideoHtml: string;
    description: string;
    registrationUrl: string;
    infoUrl: string;
    resultsUrl: string;
    save: string;
    cancel: string;
  };
}

const TYPES = ["TOURNAMENT", "CHAMPIONSHIP", "KATA", "CAMP", "OPEN", "INTERNATIONAL"];
const LEVELS = ["SM", "NSM", "SC", "FJO", "KV", "STARTTI_CUP", "KATA", "TEAM", "MUU"];
const STATUSES = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"];
const AREAS = ["LOU", "LAN", "POH", "ITA", "KAA", "ETE"];

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

export default function CompetitionForm({ defaults = {}, action, cancelHref, labels }: Props) {
  return (
    <form action={action} className="space-y-6">
      {/* Identity */}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{labels.name}</label>
          <input name="name" required defaultValue={defaults.name ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.slug}</label>
          <input name="slug" required pattern="[a-z0-9-]+" defaultValue={defaults.slug ?? ""} className={inputCls} />
        </div>
      </fieldset>

      {/* Classification */}
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{labels.type}</label>
          <select name="type" required defaultValue={defaults.type ?? "TOURNAMENT"} className={inputCls}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{labels.level}</label>
          <select name="level" defaultValue={defaults.level ?? ""} className={inputCls}>
            <option value="">—</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{labels.status}</label>
          <select name="status" defaultValue={defaults.status ?? "UPCOMING"} className={inputCls}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </fieldset>

      {/* Dates */}
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{labels.dateStart}</label>
          <input type="date" name="dateStart" required defaultValue={defaults.dateStart ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.dateEnd}</label>
          <input type="date" name="dateEnd" required defaultValue={defaults.dateEnd ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.registrationDeadline}</label>
          <input type="date" name="registrationDeadline" defaultValue={defaults.registrationDeadline ?? ""} className={inputCls} />
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="registrationOpen" id="registrationOpen" defaultChecked={defaults.registrationOpen ?? false} />
        <label htmlFor="registrationOpen" className="text-sm text-gray-700">{labels.registrationOpen}</label>
      </div>

      {/* Location */}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{labels.city}</label>
          <input name="city" required defaultValue={defaults.city ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.venue}</label>
          <input name="venue" defaultValue={defaults.venue ?? ""} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>{labels.address}</label>
          <input name="address" defaultValue={defaults.address ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.country}</label>
          <input name="country" defaultValue={defaults.country ?? "FI"} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.geographicArea}</label>
          <select name="geographicArea" defaultValue={defaults.geographicArea ?? ""} className={inputCls}>
            <option value="">—</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </fieldset>

      {/* Operational */}
      <fieldset className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={labelCls}>{labels.capacity}</label>
          <input type="number" min="0" name="capacity" defaultValue={defaults.capacity ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.tatamiCount}</label>
          <input type="number" min="1" name="numberOfTatamiMats" defaultValue={defaults.numberOfTatamiMats ?? 3} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.targetRefereeCount}</label>
          <input type="number" min="0" name="targetRefereeCount" defaultValue={defaults.targetRefereeCount ?? 0} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.matchDuration}</label>
          <input type="number" min="1" name="matchDurationMinutes" defaultValue={defaults.matchDurationMinutes ?? 7} className={inputCls} />
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <input type="checkbox" name="useCustomVideoHtml" id="useCustomVideoHtml" defaultChecked={defaults.useCustomVideoHtml ?? false} />
        <label htmlFor="useCustomVideoHtml" className="text-sm text-gray-700">{labels.useCustomVideoHtml}</label>
      </div>

      {/* External / Description */}
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>{labels.registrationUrl}</label>
          <input name="registrationUrl" type="url" defaultValue={defaults.registrationUrl ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.infoUrl}</label>
          <input name="infoUrl" type="url" defaultValue={defaults.infoUrl ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.resultsUrl}</label>
          <input name="resultsUrl" type="url" defaultValue={defaults.resultsUrl ?? ""} className={inputCls} />
        </div>
      </fieldset>

      <div>
        <label className={labelCls}>{labels.description}</label>
        <textarea name="description" rows={4} defaultValue={defaults.description ?? ""} className={inputCls} />
      </div>

      {/* Actions */}
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
