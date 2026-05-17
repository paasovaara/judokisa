import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function AuthLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Already signed in? Go straight to profile.
  const user = await getCurrentUser();
  if (user) redirect(`/${locale}/profile`);

  // No Supabase configured yet → fall back to the dev mock login picker.
  if (!supabaseConfigured()) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations({ locale, namespace: "auth.login" });

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-8 text-sm text-gray-600">{t("intro")}</p>

      <LoginForm
        locale={locale}
        forgotPasswordHref={`/${locale}/auth/reset-password`}
        labels={{
          email: t("email"),
          password: t("password"),
          signInButton: t("sign_in_button"),
          magicLinkButton: t("magic_link_button"),
          magicLinkHint: t("magic_link_hint"),
          passwordHint: t("password_hint"),
          forgotPassword: t("forgot_password"),
        }}
      />

      <p className="mt-8 text-center text-sm text-gray-500">
        {t("no_account")}{" "}
        <Link href={`/${locale}/auth/register`} className="text-primary-light hover:underline">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
