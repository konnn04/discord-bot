import { db } from '../database/client';
import { guilds, type Guild, type NewGuild } from '../database/schema';
import { eq, inArray, and, notInArray } from 'drizzle-orm';
import { Guild as DiscordGuild } from 'discord.js';

export class GuildService {
  /**
   * Get a guild by ID, or create it if it doesn't exist.
   * If creating without data, it will be marked as "Unknown Server".
   */
  static async getOrCreate(guildId: string, guildData?: Partial<NewGuild>): Promise<Guild> {
    const existingGuild = await db.query.guilds.findFirst({
      where: eq(guilds.guildId, guildId),
    });
    
    if (existingGuild) {
      if (guildData?.guildName && existingGuild.guildName === 'Unknown Server') {
        console.log(`[Guild] Updating "Unknown Server" for ${guildId} with name: ${guildData.guildName}`);
        await this.update(guildId, guildData);
        return { ...existingGuild, ...guildData };
      }
      return existingGuild;
    }

    if (!guildData?.guildName) {
      console.log(`[Guild] Creating placeholders for known guild ${guildId} (Waiting for sync)`);
    }

    const [newGuild] = await db.insert(guilds)
      .values({
        guildId,
        guildName: guildData?.guildName || 'Unknown Server',
        ownerId: guildData?.ownerId || '0',
        memberCount: guildData?.memberCount || 0,
        isActive: true,
        ...guildData,
      })
      .returning();
    
    return newGuild;
  }

  /**
   * Update an existing guild's information.
   */
  static async update(guildId: string, data: Partial<NewGuild>): Promise<Guild | null> {
    const [updatedGuild] = await db.update(guilds)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(guilds.guildId, guildId))
      .returning();
    
    return updatedGuild || null;
  }

  /**
   * Sync a Discord guild state to the database (Upsert equivalent).
   */
  static async syncGuild(guild: DiscordGuild): Promise<Guild> {
    const existingGuild = await db.query.guilds.findFirst({
      where: eq(guilds.guildId, guild.id),
    });

    const guildData = {
      guildName: guild.name,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount,
      isActive: true,
      leftAt: null, // Reset leftAt if they rejoin
    };

    console.log(`[Guild] Syncing guild: ${guild.name} (${guild.id})`);

    if (existingGuild) {
      const [updated] = await db.update(guilds)
        .set({ ...guildData, updatedAt: new Date() })
        .where(eq(guilds.guildId, guild.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(guilds)
        .values({
          guildId: guild.id,
          ...guildData,
        })
        .returning();
      return created;
    }
  }

  /**
   * Mark a guild as inactive (when bot is kicked or leaves).
   */
  static async deactivate(guildId: string): Promise<void> {
    await db.update(guilds)
      .set({ 
        isActive: false, 
        leftAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(guilds.guildId, guildId));
  }

  /**
   * Deactivate guilds that are in DB as active but not in the provided list of active guild IDs.
   * This is used during bot startup to clean up "ghost" guilds.
   */
  static async deactivateMissing(activeGuildIds: string[]): Promise<void> {
    if (activeGuildIds.length === 0) return;

    // Find guilds that are active in DB but NOT in the activeGuildIds list
    const ghostGuilds = await db.query.guilds.findMany({
      where: and(
        eq(guilds.isActive, true),
        notInArray(guilds.guildId, activeGuildIds)
      ),
    });

    if (ghostGuilds.length > 0) {
      console.log(`[Guild] Found ${ghostGuilds.length} ghost guilds to deactivate.`);
      
      for (const guild of ghostGuilds) {
        console.log(`[Guild] Deactivating ghost guild: ${guild.guildName} (${guild.guildId})`);
        await this.deactivate(guild.guildId);
      }
    }
  }
}