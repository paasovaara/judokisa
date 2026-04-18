import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function CompetitionLivestreamsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  let data;
  try {
    data = await prisma.competition.findUnique({
      where: { slug },
      select: { videoUrl: true, name: true },
    });
  } catch {
    data = null;
  }

  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });

  if (!data.videoUrl) {
    return <p className="text-sm text-gray-500">{t("no_stream")}</p>;
  }

  const isYouTube =
    data.videoUrl.includes("youtube.com") || data.videoUrl.includes("youtu.be");

  const embedUrl = isYouTube
    ? data.videoUrl
        .replace("watch?v=", "embed/")
        .replace("youtu.be/", "www.youtube.com/embed/")
    : null;

  return (
    <div>
      {embedUrl ? (
        <div className="aspect-video overflow-hidden rounded-xl shadow">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            title={data.name}
          />
        </div>
      ) : (
        <a
          href={data.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          ▶ {t("watch_stream")}
        </a>
      )}
    </div>
  );
}
