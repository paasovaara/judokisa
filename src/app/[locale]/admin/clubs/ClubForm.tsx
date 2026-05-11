"use client";

import Link from "next/link";

interface FormDefaults {
  displayName?: string;
  country?: string;
  suomiSportName?: string | null;
}

interface Props {
  defaults?: FormDefaults;
  action: (form: FormData) => void;
  cancelHref: string;
  labels: {
    displayName: string;
    country: string;
    suomiSportName: string;
    save: string;
    cancel: string;
  };
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

export default function ClubForm({ defaults = {}, action, cancelHref, labels }: Props) {
  return (
    <form action={action} className="space-y-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>{labels.displayName}</label>
          <input name="displayName" required defaultValue={defaults.displayName ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.country}</label>
          <input name="country" defaultValue={defaults.country ?? "FIN"} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{labels.suomiSportName}</label>
          <input name="suomiSportName" defaultValue={defaults.suomiSportName ?? ""} className={inputCls} />
        </div>
      </fieldset>

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
