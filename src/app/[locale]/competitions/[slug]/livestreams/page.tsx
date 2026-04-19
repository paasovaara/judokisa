"use client";

import { useTranslations } from "next-intl";
import { use } from "react";
import { useCompetitionTabs } from "@/components/CompetitionTabsProvider";

export default function CompetitionLivestreamsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = use(params);
  const { data } = useCompetitionTabs();
  const t = useTranslations("competition");

  if (!data) {
    return <div className="h-48 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (data.videoFeeds.length === 0) {
    return <p className="text-sm text-gray-500">{t("no_feeds")}</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.videoFeeds.map((feed) => {
        const isYouTube =
          feed.url.includes("youtube.com") || feed.url.includes("youtu.be");

        return (
          <div
            key={feed.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
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
                  title={`${slug} — ${feed.name}`}
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
