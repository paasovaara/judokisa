import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-primary-dark py-8 text-blue-100">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold text-white">🥋 JudoKisa</p>
            <p className="text-sm opacity-70">© {new Date().getFullYear()} {t("copyright")}</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-sm sm:items-end">
            <div className="flex gap-4">
              <Link href={`/${locale}/competitions`} className="hover:text-white">
                {locale === "fi" ? "Kilpailut" : "Competitions"}
              </Link>
            </div>
            <p className="text-xs opacity-50">{t("data_source")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
