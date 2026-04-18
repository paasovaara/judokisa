/*
  Warnings:

  - You are about to drop the column `videoUrl` on the `Competition` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Competition" DROP COLUMN "videoUrl";

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "club" TEXT,
    "beltRank" TEXT,
    "gender" "Gender" NOT NULL,
    "birthYear" INTEGER,
    "weightCategory" TEXT NOT NULL,
    "ageCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoFeed" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "VideoFeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Competitor_competitionId_idx" ON "Competitor"("competitionId");

-- CreateIndex
CREATE INDEX "Competitor_name_idx" ON "Competitor"("name");

-- CreateIndex
CREATE INDEX "VideoFeed_competitionId_idx" ON "VideoFeed"("competitionId");

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFeed" ADD CONSTRAINT "VideoFeed_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
