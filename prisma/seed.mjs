// Seed script — reads docs/appendix-clubs.md (source of truth) and upserts clubs.
// Run with: `node prisma/seed.mjs`
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APPENDIX = path.resolve(__dirname, "..", "docs", "appendix-clubs.md");

function parseAppendix(markdown) {
  const lines = markdown.split("\n");
  const out = [];
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // Layout: ['', display, suomisport, '']
    if (cells.length < 4) continue;
    const display = cells[1];
    const suomi = cells[2];
    // Skip the header and separator rows
    if (!display || display === "Judokisa display name" || /^[-:]+$/.test(display)) continue;
    const suomiSportName =
      !suomi || suomi === "*(no mapping)*" ? null : suomi;
    out.push({ displayName: display, suomiSportName });
  }
  return out;
}

async function main() {
  const md = await fs.readFile(APPENDIX, "utf8");
  const clubs = parseAppendix(md);
  console.log(`Parsed ${clubs.length} clubs from ${path.relative(process.cwd(), APPENDIX)}`);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — seed cannot connect.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ["error", "warn"],
  });
  try {
    let created = 0;
    let updated = 0;
    for (const club of clubs) {
      const result = await prisma.club.upsert({
        where: { displayName: club.displayName },
        create: { displayName: club.displayName, suomiSportName: club.suomiSportName, country: "FIN" },
        update: { suomiSportName: club.suomiSportName },
      });
      if (result.country) {
        // crude created/updated detection — Prisma doesn't expose it; assume non-zero if we got here
        // (we'll just print totals)
      }
      created++; // counted as touched
    }
    void updated;
    const total = await prisma.club.count();
    console.log(`Done. ${created} clubs upserted; total in DB: ${total}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
