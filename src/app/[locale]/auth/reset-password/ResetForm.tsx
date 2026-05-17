"use client";

import { useActionState } from "react";
import { sendResetEmail, type ResetState } from "./actions";

interface Labels {
  email: string;
  submit: string;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

export default function ResetForm({
  locale,
  labels,
}: {
  locale: string;
  labels: Labels;
}) {
  const [state, action, pending] = useActionState<ResetState | null, FormData>(
    sendResetEmail.bind(null, locale),
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={labelCls}>{labels.email}</label>
        <input name="email" type="email" required className={inputCls} autoComplete="email" />
      </div>
      {state && (
        <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.ok ? state.message : state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {labels.submit}
      </button>
    </form>
  );
}
