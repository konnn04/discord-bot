import { db } from '../database/client';
import { userGuildStats, guildSettings } from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { GuildMember, TextChannel, Message } from 'discord.js';
import { GuildSettingsService } from './GuildSettingsService';

export class LevelingService {
  
  /**
   * Calculate XP needed for next level
   * Formula: 5 * (level^2) + 50 * level + 100
   */
  static getXpForLevel(level: number): number {
    return 5 * (level ** 2) + 50 * level + 100;
  }

  /**
   * Calculate current level based on total XP
   * Simplified approx: Level = 0.1 * sqrt(XP)
   */
  static getLevelFromXp(xp: number): number {
    let level = 0;
    while (this.getXpForLevel(level) <= xp) {
      xp -= this.getXpForLevel(level);
      level++;
    }
    return level;
  }
  
  /**
   * Get total accumulated XP needed to reach a specific level
   */
  static getTotalXpForLevel(level: number): number {
    let totalXp = 0;
    for (let i = 0; i < level; i++) {
        totalXp += this.getXpForLevel(i);
    }
    return totalXp;
  }

  static async getUserStats(guildId: string, userId: string) {
    const stats = await db.query.userGuildStats.findFirst({
      where: and(
        eq(userGuildStats.guildId, guildId),
        eq(userGuildStats.userId, userId)
      ),
    });
    
    if (!stats) {
      // Create new initial stats
      return this.createStats(guildId, userId);
    }
    
    return stats;
  }

  static async createStats(guildId: string, userId: string) {
    const [stats] = await db.insert(userGuildStats)
      .values({
        guildId,
        userId,
      })
      .returning();
    return stats;
  }

  /**
   * Add XP to user for a message
   */
  static async addMessageXp(guildId: string, userId: string, member: GuildMember, channel: TextChannel) {
    // 1. Check settings
    const settings = await GuildSettingsService.getOrCreate(guildId);
    if (!settings.levelingEnabled) return;

    // 2. Get User Stats
    let stats = await this.getUserStats(guildId, userId);

    // 3. Check Cooldown
    const now = new Date();
    if (stats.lastMessageAt) {
      const diff = (now.getTime() - stats.lastMessageAt.getTime()) / 1000;
      if (diff < (settings.cooldownMessage || 60)) {
        return; // Spam prevention
      }
    }

    // 4. Calculate XP Gain
    const baseXp = settings.xpRateMessage || 20;
    const gainedXp = Math.floor(baseXp + Math.random() * 6); // Random variance +0-5

    // 5. Update DB
    const [updatedStats] = await db.update(userGuildStats)
      .set({
        xp: stats.xp! + gainedXp,
        messageCount: stats.messageCount! + 1,
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(userGuildStats.guildId, guildId),
        eq(userGuildStats.userId, userId)
      ))
      .returning();
      
    // 6. Check Level Up
    await this.checkLevelUp(updatedStats, settings, member, channel);
  }

  /**
   * Add XP for Voice activity (Called periodically or on leave)
   */
  static async addVoiceXp(guildId: string, userId: string, seconds: number) {
     const settings = await GuildSettingsService.getOrCreate(guildId);
     if (!settings.levelingEnabled) return;
     
     const stats = await this.getUserStats(guildId, userId);
     
     // Calculate XP: (seconds / 60) * rate
     const minutes = seconds / 60;
     const gainedXp = Math.floor(minutes * (settings.xpRateVoice || 10));
     
     if (gainedXp <= 0) {
        // Just update time if XP is 0 (less than a minute typically)
        await db.update(userGuildStats)
            .set({
                voiceSeconds: stats.voiceSeconds! + seconds,
                updatedAt: new Date(),
            })
            .where(and(
                eq(userGuildStats.guildId, guildId),
                eq(userGuildStats.userId, userId)
            ));
        return;
     }

     const [updatedStats] = await db.update(userGuildStats)
      .set({
        xp: stats.xp! + gainedXp,
        voiceSeconds: stats.voiceSeconds! + seconds,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userGuildStats.guildId, guildId),
        eq(userGuildStats.userId, userId)
      ))
      .returning();
      
      // Note: We usually don't announce voice level ups to avoid spamming chat from voice, 
      // or we can announce in a specific channel but passing 'channel' here is hard.
      // For now, we update level silently if needed.
      await this.checkLevelUp(updatedStats, settings, null, null);
  }

  private static async checkLevelUp(stats: typeof userGuildStats.$inferSelect, settings: typeof guildSettings.$inferSelect, member: GuildMember | null, channel: TextChannel | null) {
      const currentLevel = stats.level || 0;
      const nextLevelXp = this.getTotalXpForLevel(currentLevel + 1);
      
      if (stats.xp! >= nextLevelXp) {
          const newLevel = currentLevel + 1;
          
          await db.update(userGuildStats)
            .set({ level: newLevel })
            .where(and(
                eq(userGuildStats.guildId, stats.guildId),
                eq(userGuildStats.userId, stats.userId)
            ));
            
          if (channel && settings.levelUpChannelId !== 'disabled') {
              const msg = `🎉 **${member?.user.username || 'User'}** has leveled up to Level **${newLevel}**!`;
              
              if (settings.levelUpChannelId) {
                  const levelChannel = channel.guild.channels.cache.get(settings.levelUpChannelId);
                  if (levelChannel?.isTextBased()) {
                      await (levelChannel as TextChannel).send(msg);
                  }
              } else {
                  // Reply in context
                  await channel.send(msg);
              }
          }
      }
  }

  static async getLeaderboard(guildId: string, limit = 10) {
      return db.query.userGuildStats.findMany({
          where: eq(userGuildStats.guildId, guildId),
          orderBy: (stats, { desc }) => [desc(stats.xp)],
          limit: limit,
      });
  }
  
  static async getRank(guildId: string, userId: string): Promise<number> {
      // Count how many users have more XP than this user
      const userStats = await this.getUserStats(guildId, userId);
      
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(userGuildStats)
        .where(and(
            eq(userGuildStats.guildId, guildId),
            sql`${userGuildStats.xp} > ${userStats.xp || 0}`
        ));
        
      return Number(result[0].count) + 1;
  }

  static async startVoiceSession(guildId: string, userId: string) {
       // Ensure stats exist
       await this.getUserStats(guildId, userId);
       
       await db.update(userGuildStats)
        .set({ lastVoiceUpdateAt: new Date(), updatedAt: new Date() })
        .where(and(
            eq(userGuildStats.guildId, guildId),
            eq(userGuildStats.userId, userId)
        ));
  }

  static async endVoiceSession(guildId: string, userId: string) {
      const stats = await this.getUserStats(guildId, userId);
      if (stats && stats.lastVoiceUpdateAt) {
          const now = new Date();
          const diffSeconds = Math.floor((now.getTime() - stats.lastVoiceUpdateAt.getTime()) / 1000);
          
          if (diffSeconds > 0) {
              await this.addVoiceXp(guildId, userId, diffSeconds);
          }
          
          // Reset timestamp
          await db.update(userGuildStats)
            .set({ lastVoiceUpdateAt: null })
            .where(and(
                eq(userGuildStats.guildId, guildId),
                eq(userGuildStats.userId, userId)
            ));
      }
  }

  static async switchVoiceSession(guildId: string, userId: string) {
       // Ideally we process the XP gain and reset the timer to NOW, instead of NULL then NOW.
       const stats = await this.getUserStats(guildId, userId);
       if (stats && stats.lastVoiceUpdateAt) {
           const now = new Date();
           const diffSeconds = Math.floor((now.getTime() - stats.lastVoiceUpdateAt.getTime()) / 1000);
           
           if (diffSeconds > 0) {
               await this.addVoiceXp(guildId, userId, diffSeconds);
           }
           
           // Reset timestamp to NOW (start new session)
           await db.update(userGuildStats)
             .set({ lastVoiceUpdateAt: new Date(), updatedAt: new Date() })
             .where(and(
                 eq(userGuildStats.guildId, guildId),
                 eq(userGuildStats.userId, userId)
             ));
       } else {
           // Treating as a start if no previous session found
           await this.startVoiceSession(guildId, userId);
       }
  }
}
