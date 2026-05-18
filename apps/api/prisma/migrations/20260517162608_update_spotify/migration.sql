-- AlterTable
ALTER TABLE "StalkerSubscription" ADD COLUMN     "lastMessageNotifyAt" TIMESTAMP(3),
ADD COLUMN     "onMessage" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConfessionConfig" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfessionConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "ConfessionLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifyToken" (
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifyToken_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "ConfessionLog_guildId_idx" ON "ConfessionLog"("guildId");

-- CreateIndex
CREATE INDEX "ConfessionLog_guildId_postedAt_idx" ON "ConfessionLog"("guildId", "postedAt");

-- CreateIndex
CREATE INDEX "Reminder_remindAt_idx" ON "Reminder"("remindAt");
