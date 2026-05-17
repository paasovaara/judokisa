import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase/server";
import SignUpForm from "./SignUpForm";

export default async function AuthRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Already signed in? Skip the form.
  const user = await getCurrentUser();
  if (user) redirect(`/${locale}/profile`);

  // No Supabase configured — show a dev-mode notice rather than a broken form.
  if (!supabaseConfigured()) {
    const t = await getTranslations({ locale, namespace: "auth.register" });
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mb-6 text-sm text-gray-600">{t("dev_mode_hint")}</p>
        <Link
          href={`/${locale}/login`}
          className="inline-block rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t("back_to_login")}
        </Link>
      </div>
    );
  }

  const t = await getTranslations({ locale, namespace: "auth.register" });

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-600">{t("intro")}</p>

      <SignUpForm
        locale={locale}
        labels={{
          email: t("email"),
          password: t("password"),
          passwordHint: t("password_hint"),
          firstName: t("first_name"),
          lastName: t("last_name"),
          submit: t("submit"),
        }}
      />

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("have_account")}{" "}
        <Link href={`/${locale}/auth/login`} className="text-primary-light hover:underline">
          {t("sign_in")}
        </Link>
      </p>
    </div>
  );
}
