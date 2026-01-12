import { db } from '../database/client';
import { guildSettings, type GuildSettings, type NewGuildSettings } from '../database/schema';
import { eq } from 'drizzle-orm';
import { type NewGuild } from '../database/schema';
import { GuildService } from './GuildService';

export class GuildSettingsService {
    // Get settings với fallback to defaults
    static async get(guildId: string): Promise<GuildSettings | null> {
        const result = await db.query.guildSettings.findFirst({
            where: eq(guildSettings.guildId, guildId),
        });

        return result || null;
    }
    // Get hoặc tạo mới với defaults

    static async getOrCreate(
        guildId: string,
        guildData?: Partial<NewGuild>
    ): Promise<GuildSettings> {
        await GuildService.getOrCreate(guildId, guildData);
        let settings = await this.get(guildId);

        if (!settings) {
            settings = await this.create({ guildId });
        }

        return settings;
    }
    // Create new settings
    static async create(data: NewGuildSettings): Promise<GuildSettings> {
        const [newSettings] = await db.insert(guildSettings)
            .values(data)
            .returning();

        return newSettings;
    }
    // Update settings
    static async update(
        guildId: string,
        data: Partial<NewGuildSettings>
    ): Promise<GuildSettings> {
        const [updated] = await db.update(guildSettings)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(guildSettings.guildId, guildId))
            .returning();

        return updated;
    }
    // Delete settings
    static async delete(guildId: string): Promise<void> {
        await db.delete(guildSettings)
            .where(eq(guildSettings.guildId, guildId));
    }
    // Get specific setting with type safety
    static async getSetting<K extends keyof GuildSettings>(
        guildId: string,
        key: K
    ): Promise<GuildSettings[K] | null> {
        const settings = await this.get(guildId);
        return settings?.[key] ?? null;
    }
}