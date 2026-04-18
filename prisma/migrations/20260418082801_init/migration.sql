-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('TOURNAMENT', 'CHAMPIONSHIP', 'KATA', 'CAMP', 'OPEN', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MatchRound" AS ENUM ('POOL', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'BRONZE', 'FINAL');

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CompetitionType" NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'UPCOMING',
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "city" TEXT NOT NULL,
    "venue" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FI',
    "description" TEXT,
    "categories" TEXT[],
    "weightCategories" TEXT[],
    "capacity" INTEGER,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "videoUrl" TEXT,
    "registrationUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "athleteName" TEXT NOT NULL,
    "club" TEXT,
    "weightCategory" TEXT NOT NULL,
    "ageCategory" TEXT,
    "gender" "Gender" NOT NULL,
    "placement" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "athlete1Name" TEXT NOT NULL,
    "athlete2Name" TEXT NOT NULL,
    "athlete1Club" TEXT,
    "athlete2Club" TEXT,
    "athlete1Score" INTEGER,
    "athlete2Score" INTEGER,
    "winnerName" TEXT,
    "weightCategory" TEXT NOT NULL,
    "ageCategory" TEXT,
    "gender" "Gender" NOT NULL,
    "round" "MatchRound",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_sourceId_key" ON "Competition"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Competition_status_dateStart_idx" ON "Competition"("status", "dateStart");

-- CreateIndex
CREATE INDEX "Competition_slug_idx" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Result_competitionId_idx" ON "Result"("competitionId");

-- CreateIndex
CREATE INDEX "Result_athleteName_idx" ON "Result"("athleteName");

-- CreateIndex
CREATE INDEX "Match_competitionId_idx" ON "Match"("competitionId");

-- CreateIndex
CREATE INDEX "Match_athlete1Name_idx" ON "Match"("athlete1Name");

-- CreateIndex
CREATE INDEX "Match_athlete2Name_idx" ON "Match"("athlete2Name");

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
