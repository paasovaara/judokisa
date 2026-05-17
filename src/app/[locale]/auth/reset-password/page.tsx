import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ResetForm from "./ResetForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.reset" });

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-sm text-gray-600">{t("intro")}</p>
      <ResetForm locale={locale} labels={{ email: t("email"), submit: t("submit") }} />
      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href={`/${locale}/auth/login`} className="text-primary-light hover:underline">
          {t("back_to_login")}
        </Link>
      </p>
    </div>
  );
}
