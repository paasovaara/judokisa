"use client";

import { useActionState } from "react";
import {
  loginWithPassword,
  sendMagicLink,
  type AuthState,
} from "./actions";

interface Labels {
  email: string;
  password: string;
  signInButton: string;
  magicLinkButton: string;
  magicLinkHint: string;
  passwordHint: string;
  forgotPassword: string;
}

interface Props {
  locale: string;
  labels: Labels;
  forgotPasswordHref: string;
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

export default function LoginForm({ locale, labels, forgotPasswordHref }: Props) {
  const [pwState, pwAction, pwPending] = useActionState<AuthState | null, FormData>(
    loginWithPassword.bind(null, locale),
    null,
  );
  const [linkState, linkAction, linkPending] = useActionState<AuthState | null, FormData>(
    sendMagicLink.bind(null, locale),
    null,
  );

  return (
    <div className="space-y-8">
      <form action={pwAction} className="space-y-4">
        <div>
          <label className={labelCls}>{labels.email}</label>
          <input name="email" type="email" required className={inputCls} autoComplete="email" />
        </div>
        <div>
          <label className={labelCls}>{labels.password}</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className={inputCls}
            autoComplete="current-password"
          />
          <p className="mt-1 text-xs text-gray-400">{labels.passwordHint}</p>
        </div>
        {pwState && !pwState.ok && (
          <p className="text-sm text-danger">{pwState.error}</p>
        )}
        <button
          type="submit"
          disabled={pwPending}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {labels.signInButton}
        </button>
        <a href={forgotPasswordHref} className="block text-center text-xs text-primary-light hover:underline">
          {labels.forgotPassword}
        </a>
      </form>

      <div className="border-t border-gray-200 pt-6">
        <p className="mb-2 text-xs text-gray-500">{labels.magicLinkHint}</p>
        <form action={linkAction} className="flex gap-2">
          <input
            name="email"
            type="email"
            required
            className={inputCls}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={linkPending}
            className="whitespace-nowrap rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            {labels.magicLinkButton}
          </button>
        </form>
        {linkState && (
          <p className={`mt-2 text-sm ${linkState.ok ? "text-success" : "text-danger"}`}>
            {linkState.ok ? linkState.message : linkState.error}
          </p>
        )}
      </div>
    </div>
  );
}
