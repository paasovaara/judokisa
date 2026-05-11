-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "athleteId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "athlete1Id" TEXT,
ADD COLUMN     "athlete2Id" TEXT;

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "athleteId" TEXT;

-- CreateIndex
CREATE INDEX "Competitor_athleteId_idx" ON "Competitor"("athleteId");

-- CreateIndex
CREATE INDEX "Match_athlete1Id_idx" ON "Match"("athlete1Id");

-- CreateIndex
CREATE INDEX "Match_athlete2Id_idx" ON "Match"("athlete2Id");

-- CreateIndex
CREATE INDEX "Result_athleteId_idx" ON "Result"("athleteId");

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_athlete1Id_fkey" FOREIGN KEY ("athlete1Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_athlete2Id_fkey" FOREIGN KEY ("athlete2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
