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
      select: {
        name: true,
        videoFeeds: { orderBy: { name: "asc" } },
      },
    });
  } catch {
    data = null;
  }

  if (!data) notFound();

  const t = await getTranslations({ locale, namespace: "competition" });

  if (data.videoFeeds.length === 0) {
    return <p className="text-sm text-gray-500">{t("no_feeds")}</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.videoFeeds.map((feed) => {
        const isYouTube =
          feed.url.includes("youtube.com") || feed.url.includes("youtu.be");

        return (
          <div key={feed.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
              <span className="text-sm font-semibold text-primary">{feed.name}</span>
            </div>
            {isYouTube ? (
              <div className="aspect-video">
                <iframe
                  src={feed.url}
                  className="h-full w-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={`${data.name} — ${feed.name}`}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center px-4 py-8">
                <a
                  href={feed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  ▶ {feed.name}
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
