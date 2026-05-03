/*
  Warnings:

  - A unique constraint covering the columns `[discordId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `discordId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discordId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "ownerId" TEXT NOT NULL,
    "settings" JSONB,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "settings" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "totalVoiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "meetingsAttended" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMemberXp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMemberXp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicPresence" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "showcaseGuildIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicPresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftcodeCache" (
    "game" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "codes" JSONB NOT NULL,

    CONSTRAINT "GiftcodeCache_pkey" PRIMARY KEY ("game")
);

-- CreateIndex
CREATE INDEX "GuildMember_guildId_idx" ON "GuildMember"("guildId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_xp_idx" ON "GuildMember"("guildId", "xp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_userId_guildId_key" ON "GuildMember"("userId", "guildId");

-- CreateIndex
CREATE INDEX "GuildMemberXp_guildId_period_xp_idx" ON "GuildMemberXp"("guildId", "period", "xp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "GuildMemberXp_userId_guildId_period_key" ON "GuildMemberXp"("userId", "guildId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "PublicPresence_discordId_key" ON "PublicPresence"("discordId");

-- CreateIndex
CREATE INDEX "PublicPresence_discordId_idx" ON "PublicPresence"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMemberXp" ADD CONSTRAINT "GuildMemberXp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMemberXp" ADD CONSTRAINT "GuildMemberXp_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
