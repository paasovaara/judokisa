import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import UserForm from "../UserForm";
import { createUser } from "../actions";
import { buildUserFormLabels } from "../labels";

export default async function NewUserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.users" });
  const labels = await buildUserFormLabels(locale);
  const clubs = await prisma.club.findMany({
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });

  async function action(form: FormData) {
    "use server";
    await createUser(locale, form);
  }

  return (
    <div>
      <Link
        href={`/${locale}/admin/users`}
        className="mb-4 inline-block text-sm text-primary-light hover:underline"
      >
        ← {t("title")}
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("new")}</h1>
      <UserForm
        action={action}
        cancelHref={`/${locale}/admin/users`}
        labels={labels}
        clubs={clubs}
      />
    </div>
  );
}
