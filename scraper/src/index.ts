import "dotenv/config";
import type { JudoGrade } from "@prisma/client";
import { prisma } from "./lib/db.js";
import { scrapeCompetitionList } from "./scrapers/list.js";
import { scrapeDetail, scrapeResults, scrapeCompetitors, scrapeVideoFeeds } from "./scrapers/detail.js";

const DRY_RUN =
  process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");

const REQUEST_DELAY_MS = parseInt(process.env.REQUEST_DELAY_MS ?? "1000", 10);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`\n🥋 JudoKisa scraper — ${new Date().toISOString()}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE"}\n`);

  // ── 1. Scrape competition list ──────────────────────────────────────────
  const competitions = await scrapeCompetitionList();

  if (competitions.length === 0) {
    console.warn("No competitions found. Check if judokisa.fi is reachable.");
    return;
  }

  let created = 0;
  let updated = 0;
  let resultsUpserted = 0;
  let competitorsUpserted = 0;
  let feedsUpserted = 0;

  for (const comp of competitions) {
    process.stdout.write(`  ${comp.name} (${comp.sourceId}) ... `);

    // ── 2. Scrape detail (info page) ─────────────────────────────────────
    await sleep(REQUEST_DELAY_MS);
    const detail = await scrapeDetail(comp.sourceId);

    // ── 3. Scrape video feeds ─────────────────────────────────────────────
    await sleep(REQUEST_DELAY_MS);
    const videoFeeds = await scrapeVideoFeeds(comp.sourceId);

    // ── 4. Scrape competitors (upcoming + ongoing + completed) ────────────
    await sleep(REQUEST_DELAY_MS);
    const competitors = await scrapeCompetitors(comp.sourceId);

    const competitionData = {
      name: comp.name,
      slug: comp.slug,
      type: comp.type as Parameters<typeof prisma.competition.upsert>[0]["create"]["type"],
      status: comp.status as Parameters<typeof prisma.competition.upsert>[0]["create"]["status"],
      dateStart: comp.dateStart,
      dateEnd: comp.dateEnd,
      city: comp.city,
      registrationDeadline: comp.registrationDeadline,
      registeredCount: comp.registeredCount,
      capacity: comp.capacity,
      venue: detail.venue,
      description: detail.description,
      registrationUrl: detail.registrationUrl,
    };

    if (DRY_RUN) {
      console.log(
        `[dry] ${comp.status} | ${competitors.length} competitors | ${videoFeeds.length} feeds`,
      );
      continue;
    }

    // Upsert competition
    const existing = await prisma.competition.findUnique({
      where: { sourceId: comp.sourceId },
      select: { id: true },
    });

    let competitionId: string;
    if (existing) {
      await prisma.competition.update({
        where: { sourceId: comp.sourceId },
        data: competitionData,
      });
      competitionId = existing.id;
      updated++;
    } else {
      const created_ = await prisma.competition.create({
        data: { ...competitionData, sourceId: comp.sourceId },
      });
      competitionId = created_.id;
      created++;
    }

    // ── 5. Replace video feeds ────────────────────────────────────────────
    await prisma.videoFeed.deleteMany({ where: { competitionId } });
    if (videoFeeds.length > 0) {
      await prisma.videoFeed.createMany({
        data: videoFeeds.map((f) => ({ competitionId, name: f.name, url: f.url })),
      });
      feedsUpserted += videoFeeds.length;
    }

    // ── 6. Replace competitors ────────────────────────────────────────────
    await prisma.competitor.deleteMany({ where: { competitionId } });
    if (competitors.length > 0) {
      await prisma.competitor.createMany({
        data: competitors.map((c) => ({
          competitionId,
          firstName: c.firstName,
          lastName: c.lastName,
          country: c.country ?? "FIN",
          clubName: c.clubName,
          judoGrade: c.judoGrade as JudoGrade | null,
          gender: c.gender,
          yearOfBirth: c.yearOfBirth,
          weightClass: c.weightClass,
          ageCategory: c.ageCategory,
        })),
      });
      competitorsUpserted += competitors.length;
    }

    // ── 7. Replace results for completed competitions ─────────────────────
    if (comp.status === "COMPLETED") {
      await sleep(REQUEST_DELAY_MS);
      const results = await scrapeResults(comp.sourceId);

      if (results.length > 0) {
        await prisma.result.deleteMany({ where: { competitionId } });
        await prisma.result.createMany({
          data: results.map((r) => ({
            competitionId,
            firstName: r.firstName,
            lastName: r.lastName,
            clubName: r.clubName,
            weightClass: r.weightClass,
            ageCategory: r.ageCategory,
            gender: r.gender,
            placement: r.placement,
          })),
        });
        resultsUpserted += results.length;
        console.log(
          `✓  ${results.length} results | ${competitors.length} competitors | ${videoFeeds.length} feeds`,
        );
      } else {
        console.log(`✓  (no results) | ${competitors.length} competitors | ${videoFeeds.length} feeds`);
      }
    } else {
      console.log(`✓  ${comp.status} | ${competitors.length} competitors | ${videoFeeds.length} feeds`);
    }
  }

  await prisma.$disconnect();

  console.log(`
✅ Done.
   Competitions created  : ${created}
   Competitions updated  : ${updated}
   Result rows upserted  : ${resultsUpserted}
   Competitors upserted  : ${competitorsUpserted}
   Video feeds upserted  : ${feedsUpserted}
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  prisma.$disconnect();
  process.exit(1);
});
