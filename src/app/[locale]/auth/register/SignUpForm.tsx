"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "./actions";

interface Labels {
  email: string;
  password: string;
  passwordHint: string;
  firstName: string;
  lastName: string;
  submit: string;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

export default function SignUpForm({
  locale,
  labels,
}: {
  locale: string;
  labels: Labels;
}) {
  const [state, action, pending] = useActionState<SignUpState | null, FormData>(
    signUp.bind(null, locale),
    null,
  );

  // After successful submit, hide the form and show the confirmation message —
  // the user has nothing else to do here until they click the email link.
  if (state?.ok) {
    return (
      <div className="rounded-xl border border-success/30 bg-green-50 p-6 text-sm text-gray-700">
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{labels.firstName}</label>
          <input
            name="firstName"
            required
            maxLength={80}
            className={inputCls}
            autoComplete="given-name"
          />
        </div>
        <div>
          <label className={labelCls}>{labels.lastName}</label>
          <input
            name="lastName"
            required
            maxLength={80}
            className={inputCls}
            autoComplete="family-name"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>{labels.email}</label>
        <input
          name="email"
          type="email"
          required
          className={inputCls}
          autoComplete="email"
        />
      </div>
      <div>
        <label className={labelCls}>{labels.password}</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className={inputCls}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-gray-400">{labels.passwordHint}</p>
      </div>
      {state && !state.ok && <p className="text-sm text-danger">{state.error}</p>}
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
