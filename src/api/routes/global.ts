import { FastifyInstance } from 'fastify';
import { globalApiMiddleware } from '../middleware/globalApiAuth';
import { db } from '../../database/client';
import { userGuildStats } from '../../database/schema/userGuildStats';
import { desc, sql, eq } from 'drizzle-orm';
import { BotInfoService } from '@services/BotInfoService';

export async function globalApiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    // Only apply to /global_api/*
    await globalApiMiddleware(req, reply);
  });

  app.get('/info', async (req, reply) => {
      const rpcStatus = await BotInfoService.getRpcStatus();
      return {
          bot_name: app.discordBot.user?.username,
          bot_id: app.discordBot.user?.id,
          servers_count: app.discordBot.guilds.cache.size,
          users_count: app.discordBot.users.cache.size,
          rpc: rpcStatus
      };
  });

  app.get('/users/top', async (req, reply) => {
      const { limit = 50, guildId } = req.query as { limit?: number; guildId?: string };
      
      const whereClause = guildId ? eq(userGuildStats.guildId, guildId) : undefined;

      const topUsers = await db.query.userGuildStats.findMany({
          where: whereClause,
          orderBy: [desc(userGuildStats.xp)],
          limit: Math.min(limit, 100),
      });

      // Enrich with Discord User Info
      const enriched = await Promise.all(topUsers.map(async (stat) => {
          let user = app.discordBot.users.cache.get(stat.userId);
          if (!user) {
              try {
                  user = await app.discordBot.users.fetch(stat.userId, { force: true });
              } catch (e) { /* ignore */ }
          }
          
          const guild = app.discordBot.guilds.cache.get(stat.guildId);
          let member = guild?.members.cache.get(stat.userId);
          if (guild && !member) {
              try {
                  member = await guild.members.fetch(stat.userId);
              } catch (e) { /* ignore */ }
          }

          // Format Activity
          const activities = member?.presence?.activities.map(a => ({
              name: a.name,
              type: a.type,
              details: a.details,
              state: a.state,
              applicationId: a.applicationId
          })) || [];

          return {
              userId: stat.userId,
              username: user?.username || 'Unknown',
              globalName: user?.globalName,
              discriminator: user?.discriminator,
              avatar: user?.displayAvatarURL({ forceStatic: false }) || user?.defaultAvatarURL,
              banner: user?.bannerURL({ forceStatic: false }),
              accentColor: user?.hexAccentColor,
              guildId: stat.guildId,
              guildName: guild?.name || 'Unknown',
              xp: stat.xp,
              level: stat.level,
              voiceSeconds: stat.voiceSeconds,
              messageCount: stat.messageCount,
              // Status & Bio (Bio is "About Me" - difficult to get via Bot API usually, but we send what we can)
              status: member?.presence?.status || 'offline',
              activities: activities,
              // joinedAt: member?.joinedAt // Optional
          };
      }));

      return enriched;
  });
}
