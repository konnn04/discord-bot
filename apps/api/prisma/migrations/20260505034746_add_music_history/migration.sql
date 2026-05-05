-- CreateTable
CREATE TABLE "MusicHistory" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MusicHistory_discordId_idx" ON "MusicHistory"("discordId");

-- CreateIndex
CREATE INDEX "MusicHistory_guildId_idx" ON "MusicHistory"("guildId");

-- CreateIndex
CREATE INDEX "MusicHistory_discordId_guildId_idx" ON "MusicHistory"("discordId", "guildId");

-- CreateIndex
CREATE INDEX "MusicHistory_playedAt_idx" ON "MusicHistory"("playedAt");
