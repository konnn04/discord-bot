-- AlterTable
ALTER TABLE "User" ADD COLUMN     "leetcodeContestDm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leetcodeDailyDm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leetcodeShowPresence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leetcodeUsername" TEXT;

-- CreateTable
CREATE TABLE "VoiceChannelRole" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceChannelRole_pkey" PRIMARY KEY ("guildId","channelId")
);

-- CreateTable
CREATE TABLE "LeetcodeDailySent" (
    "guildId" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "LeetcodeDailySent_pkey" PRIMARY KEY ("guildId","date")
);

-- CreateTable
CREATE TABLE "LeetcodeDailySentUser" (
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,

    CONSTRAINT "LeetcodeDailySentUser_pkey" PRIMARY KEY ("userId","date")
);

-- CreateTable
CREATE TABLE "LeetcodeContestSent" (
    "slug" TEXT NOT NULL,
    "guildId" TEXT,
    "userId" TEXT,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeetcodeContestSent_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "AnimeTrack" (
    "userId" TEXT NOT NULL,
    "animeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "episodeCount" INTEGER,
    "nextEpisode" INTEGER,
    "airingAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimeTrack_pkey" PRIMARY KEY ("userId","animeId")
);

-- CreateTable
CREATE TABLE "AnimeEpisodeNotified" (
    "userId" TEXT NOT NULL,
    "animeId" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,

    CONSTRAINT "AnimeEpisodeNotified_pkey" PRIMARY KEY ("userId","animeId","episode")
);

-- CreateTable
CREATE TABLE "StalkerSubscription" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "onOnline" BOOLEAN NOT NULL DEFAULT false,
    "onVoice" BOOLEAN NOT NULL DEFAULT false,
    "onGame" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StalkerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StalkerOptOut" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StalkerOptOut_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "VoiceChannelRole_guildId_idx" ON "VoiceChannelRole"("guildId");

-- CreateIndex
CREATE INDEX "VoiceChannelRole_roleId_idx" ON "VoiceChannelRole"("roleId");

-- CreateIndex
CREATE INDEX "LeetcodeContestSent_guildId_idx" ON "LeetcodeContestSent"("guildId");

-- CreateIndex
CREATE INDEX "LeetcodeContestSent_userId_idx" ON "LeetcodeContestSent"("userId");

-- CreateIndex
CREATE INDEX "AnimeTrack_userId_idx" ON "AnimeTrack"("userId");

-- CreateIndex
CREATE INDEX "StalkerSubscription_trackerId_idx" ON "StalkerSubscription"("trackerId");

-- CreateIndex
CREATE INDEX "StalkerSubscription_targetId_idx" ON "StalkerSubscription"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "StalkerSubscription_trackerId_targetId_guildId_key" ON "StalkerSubscription"("trackerId", "targetId", "guildId");
