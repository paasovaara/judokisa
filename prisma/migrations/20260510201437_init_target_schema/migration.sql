-- CreateEnum
CREATE TYPE "CompetitionType" AS ENUM ('TOURNAMENT', 'CHAMPIONSHIP', 'KATA', 'CAMP', 'OPEN', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "CompetitionLevel" AS ENUM ('SM', 'NSM', 'SC', 'FJO', 'KV', 'STARTTI_CUP', 'KATA', 'TEAM', 'MUU');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GeographicArea" AS ENUM ('LOU', 'LAN', 'POH', 'ITA', 'KAA', 'ETE');

-- CreateEnum
CREATE TYPE "CategoryGender" AS ENUM ('MEN', 'WOMEN', 'BOTH');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JudoGrade" AS ENUM ('K6', 'K5', 'K4', 'K3', 'K2', 'K1', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10');

-- CreateEnum
CREATE TYPE "RefereeLicenseLevel" AS ENUM ('D', 'C', 'B', 'A', 'INT_B', 'INT_A');

-- CreateEnum
CREATE TYPE "RefereeInviteStatus" AS ENUM ('ASKED', 'DECLINED', 'PROMISED', 'AGREED', 'PRESENT');

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "slug" TEXT NOT NULL,
    "numericId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "venue" TEXT,
    "address" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FI',
    "geographicArea" "GeographicArea",
    "type" "CompetitionType" NOT NULL,
    "level" "CompetitionLevel",
    "status" "CompetitionStatus" NOT NULL DEFAULT 'UPCOMING',
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateEnd" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "capacity" INTEGER,
    "registeredCount" INTEGER NOT NULL DEFAULT 0,
    "numberOfTatamiMats" INTEGER NOT NULL DEFAULT 3,
    "targetRefereeCount" INTEGER NOT NULL DEFAULT 0,
    "matchDurationMinutes" INTEGER NOT NULL DEFAULT 7,
    "useCustomVideoHtml" BOOLEAN NOT NULL DEFAULT false,
    "extraFieldsConfig" JSONB,
    "registrationUrl" TEXT,
    "infoUrl" TEXT,
    "resultsUrl" TEXT,
    "previousYearReference" TEXT,
    "responsibleUserId" TEXT,
    "competitionManagerId" TEXT,
    "competitionAssistantId" TEXT,
    "judoShiaiOperatorId" TEXT,
    "videoOperatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionCategory" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFi" TEXT NOT NULL,
    "minAge" INTEGER NOT NULL DEFAULT 0,
    "maxAge" INTEGER NOT NULL DEFAULT 0,
    "gender" "CategoryGender" NOT NULL,
    "weightClasses" INTEGER[],

    CONSTRAINT "CompetitionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FIN',
    "suomiSportName" TEXT,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "yearOfBirth" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "country" TEXT NOT NULL DEFAULT 'FIN',
    "clubId" TEXT,
    "clubName" TEXT,
    "categoryId" TEXT,
    "weightClass" INTEGER,
    "judoGrade" "JudoGrade",
    "registeredById" TEXT,
    "licenseValid" BOOLEAN,
    "ageEligible" BOOLEAN,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "extraFieldValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "clubId" TEXT,
    "clubName" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FIN',
    "categoryId" TEXT,
    "weightClass" INTEGER,
    "ageCategory" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "placement" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "athlete1First" TEXT NOT NULL,
    "athlete1Last" TEXT NOT NULL,
    "athlete2First" TEXT NOT NULL,
    "athlete2Last" TEXT NOT NULL,
    "athlete1Club" TEXT,
    "athlete2Club" TEXT,
    "athlete1Score" INTEGER,
    "athlete2Score" INTEGER,
    "winnerSide" INTEGER,
    "categoryId" TEXT,
    "weightClass" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoFeed" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tatamiNumber" INTEGER,
    "url" TEXT NOT NULL,

    CONSTRAINT "VideoFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isReferee" BOOLEAN NOT NULL DEFAULT false,
    "isAdministrator" BOOLEAN NOT NULL DEFAULT false,
    "isCommission" BOOLEAN NOT NULL DEFAULT false,
    "isCoordinator" BOOLEAN NOT NULL DEFAULT false,
    "isCompetitionManager" BOOLEAN NOT NULL DEFAULT false,
    "isCompetitionAssistant" BOOLEAN NOT NULL DEFAULT false,
    "isCompetitionResponsible" BOOLEAN NOT NULL DEFAULT false,
    "isCourseInstructor" BOOLEAN NOT NULL DEFAULT false,
    "isJudoShiaiOperator" BOOLEAN NOT NULL DEFAULT false,
    "isVideoOperator" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "club" TEXT,
    "geographicArea" "GeographicArea",
    "judoGrade" "JudoGrade",
    "refereeLicenseLevel" "RefereeLicenseLevel",
    "profilePhoto" TEXT,
    "suomiSportInternalId" INTEGER,
    "suomiSportPersonId" INTEGER,
    "gdprNoSync" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "defaultCategoryCode" TEXT,
    "defaultWeightClass" INTEGER,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionRefereeInvitation" (
    "competitionId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" "RefereeInviteStatus" NOT NULL DEFAULT 'ASKED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "CompetitionRefereeInvitation_pkey" PRIMARY KEY ("competitionId","refereeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Competition_sourceId_key" ON "Competition"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_numericId_key" ON "Competition"("numericId");

-- CreateIndex
CREATE INDEX "Competition_status_dateStart_idx" ON "Competition"("status", "dateStart");

-- CreateIndex
CREATE INDEX "Competition_slug_idx" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "Competition_level_idx" ON "Competition"("level");

-- CreateIndex
CREATE INDEX "CompetitionCategory_competitionId_idx" ON "CompetitionCategory"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionCategory_competitionId_code_key" ON "CompetitionCategory"("competitionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Club_displayName_key" ON "Club"("displayName");

-- CreateIndex
CREATE INDEX "Competitor_competitionId_idx" ON "Competitor"("competitionId");

-- CreateIndex
CREATE INDEX "Competitor_lastName_firstName_idx" ON "Competitor"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Competitor_clubId_idx" ON "Competitor"("clubId");

-- CreateIndex
CREATE INDEX "Result_competitionId_idx" ON "Result"("competitionId");

-- CreateIndex
CREATE INDEX "Result_lastName_firstName_idx" ON "Result"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Match_competitionId_idx" ON "Match"("competitionId");

-- CreateIndex
CREATE INDEX "Match_athlete1Last_athlete1First_idx" ON "Match"("athlete1Last", "athlete1First");

-- CreateIndex
CREATE INDEX "Match_athlete2Last_athlete2First_idx" ON "Match"("athlete2Last", "athlete2First");

-- CreateIndex
CREATE INDEX "VideoFeed_competitionId_idx" ON "VideoFeed"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "CompetitionRefereeInvitation_refereeId_idx" ON "CompetitionRefereeInvitation"("refereeId");

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_competitionManagerId_fkey" FOREIGN KEY ("competitionManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_competitionAssistantId_fkey" FOREIGN KEY ("competitionAssistantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_judoShiaiOperatorId_fkey" FOREIGN KEY ("judoShiaiOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_videoOperatorId_fkey" FOREIGN KEY ("videoOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionCategory" ADD CONSTRAINT "CompetitionCategory_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CompetitionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CompetitionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CompetitionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFeed" ADD CONSTRAINT "VideoFeed_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRefereeInvitation" ADD CONSTRAINT "CompetitionRefereeInvitation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionRefereeInvitation" ADD CONSTRAINT "CompetitionRefereeInvitation_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
