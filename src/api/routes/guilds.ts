import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';
import { GuildSettingsService } from '../../services/GuildSettingsService';
import { LevelingService } from '../../services/LevelingService';
import { PermissionFlagsBits } from 'discord.js';
import { authenticate } from '@api/middleware/auth';

export const guildsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  // Get user's guilds (mutual with bot)
  app.get('/', {
    onRequest: [authenticate]
  }, async (req, reply) => {
    const user = req.user as any; 
    const accessToken = user.accessToken;

    if (!accessToken) {
        return reply.code(401).send({ error: 'No access token available' });
    }

    try {
        // Fetch user guilds from Discord
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Discord API Error] Status: ${response.status} ${response.statusText}`, errorText);
            
            if (response.status === 401) {
                return reply.code(401).send({ error: 'Discord Session Expired' });
            }
            throw new Error(`Discord API Error: ${response.status} ${response.statusText}`);
        }

        const userGuilds = await response.json() as any[];
        
        // Filter guilds where bot is also present
        const mutualGuilds = userGuilds.filter(g => client.guilds.cache.has(g.id)).map(g => {
            const botGuild = client.guilds.cache.get(g.id)!;
            const permissions = BigInt(g.permissions);
            const isAdmin = (permissions & PermissionFlagsBits.Administrator) === PermissionFlagsBits.Administrator;
            const isManager = (permissions & PermissionFlagsBits.ManageGuild) === PermissionFlagsBits.ManageGuild;
            
            return {
                id: g.id,
                name: g.name,
                icon: g.icon,
                isAdmin: isAdmin || isManager, 
                botInGuild: true
            };
        });

        return mutualGuilds;
    } catch (err: any) {
        console.error('Guilds Route Error:', err);
        const errorMessage = err.message || 'Internal Server Error';
        return reply.code(500).send({ error: errorMessage });
    }
  });

  // Get Guild Details & Stats
  app.get('/:id', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const guild = client.guilds.cache.get(id);
      
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      
      const user = req.user as any;
      const stats = await LevelingService.getUserStats(id, user.id);
      const rank = await LevelingService.getRank(id, user.id);
      
      return {
          guild: {
              id: guild.id,
              name: guild.name,
              icon: guild.iconURL(),
              memberCount: guild.memberCount,
              isAdmin: (await guild.members.fetch(user.id).catch(() => null))?.permissions.has(PermissionFlagsBits.Administrator) ?? false
          },
          userStats: {
              ...stats,
              rank
          }
      };
  });

  // Get Settings (Admin only)
  app.get('/:id/settings', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const guild = client.guilds.cache.get(id);
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      
      const user = req.user as any;
      const member = await guild.members.fetch(user.id).catch(() => null);
      
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return reply.code(403).send({ error: 'Unauthorized' });
      }

      const settings = await GuildSettingsService.getOrCreate(id);
      return settings;
  });

  // Update Settings
  app.patch('/:id/settings', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as any;
      
      const guild = client.guilds.cache.get(id);
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      
      const user = req.user as any;
      const member = await guild.members.fetch(user.id).catch(() => null);
      
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
          return reply.code(403).send({ error: 'Unauthorized' });
      }

      const updated = await GuildSettingsService.update(id, body);
      return updated;
  });
};