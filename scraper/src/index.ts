import "dotenv/config";
import { prisma } from "./lib/db.js";
import { scrapeCompetitionList } from "./scrapers/list.js";
import { scrapeDetail, scrapeResults } from "./scrapers/detail.js";

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

  for (const comp of competitions) {
    process.stdout.write(`  ${comp.name} (${comp.sourceId}) ... `);

    // ── 2. Scrape detail (info + video) ──────────────────────────────────
    await sleep(REQUEST_DELAY_MS);
    const detail = await scrapeDetail(comp.sourceId);

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
      videoUrl: detail.videoUrl,
      registrationUrl: detail.registrationUrl,
    };

    if (DRY_RUN) {
      console.log(`[dry] ${comp.status}`);
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

    // ── 3. Scrape results for completed competitions ──────────────────────
    if (comp.status === "COMPLETED") {
      await sleep(REQUEST_DELAY_MS);
      const results = await scrapeResults(comp.sourceId);

      if (results.length > 0) {
        // Replace all results for this competition on each run
        await prisma.result.deleteMany({ where: { competitionId } });
        await prisma.result.createMany({
          data: results.map((r) => ({
            competitionId,
            athleteName: r.athleteName,
            club: r.club,
            weightCategory: r.weightCategory,
            ageCategory: r.ageCategory,
            gender: r.gender as "MALE" | "FEMALE",
            placement: r.placement,
          })),
        });
        resultsUpserted += results.length;
        console.log(`✓  ${results.length} results`);
      } else {
        console.log(`✓  (no results yet)`);
      }
    } else {
      console.log(`✓  ${comp.status}`);
    }
  }

  await prisma.$disconnect();

  console.log(`
✅ Done.
   Competitions created : ${created}
   Competitions updated : ${updated}
   Result rows upserted : ${resultsUpserted}
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  prisma.$disconnect();
  process.exit(1);
});
