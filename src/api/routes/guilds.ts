import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';
import { GuildSettingsService } from '../../services/GuildSettingsService';
import { LevelingService } from '../../services/LevelingService';
import { PermissionFlagsBits } from 'discord.js';
import { authenticate } from '@api/middleware/auth';

export const guildsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  // Simple in-memory cache
  const guildCache = new Map<string, { data: any[], expires: number }>();
  const CACHE_TTL = 30 * 1000; // 30 seconds

  // Get user's guilds (mutual with bot)
  app.get('/', {
    onRequest: [authenticate]
  }, async (req, reply) => {
    const user = req.user as any; 
    const accessToken = user.accessToken;

    if (!accessToken) {
        return reply.code(401).send({ error: 'No access token available' });
    }

    // Check cache
    const cacheKey = user.id;
    const cached = guildCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
        return cached.data;
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
            if (response.status === 429) {
                 // Return cached if available even if expired, or empty
                 if (cached) return cached.data;
                 throw new Error('Rate Limited by Discord');
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

        // Set Cache
        guildCache.set(cacheKey, { data: mutualGuilds, expires: Date.now() + CACHE_TTL });

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

  // Get Guild Members
  app.get('/:id/members', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const guild = client.guilds.cache.get(id);
      
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      
      const user = req.user as any;
      const requester = await guild.members.fetch(user.id).catch(() => null);
      if (!requester) return reply.code(403).send({ error: 'Unauthorized' });

      const members = await guild.members.fetch({ limit: 100, withPresences: true }); 
      
      const result = members.map(m => ({
          id: m.id,
          username: m.user.username,
          globalName: m.user.globalName,
          avatar: m.user.displayAvatarURL(),
          roles: m.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
          joinedAt: m.joinedAt,
          status: m.presence?.status || 'offline',
          activities: m.presence?.activities || []
      }));

      return result;
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

  // Kick Member
  app.post('/:id/members/:memberId/kick', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { id, memberId } = req.params as { id: string, memberId: string };
      const { reason } = req.body as { reason?: string };
      const guild = client.guilds.cache.get(id);
      
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      
      const user = req.user as any;
      const admin = await guild.members.fetch(user.id).catch(() => null);
      
      if (!admin || !admin.permissions.has(PermissionFlagsBits.Administrator) && !admin.permissions.has(PermissionFlagsBits.KickMembers)) {
           return reply.code(403).send({ error: 'Unauthorized' });
      }

      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) return reply.code(404).send({ error: 'Member not found' });

      if (!member.kickable) return reply.code(400).send({ error: 'Bot cannot kick this member (Role Hierarchy)' });
      
      await member.kick(reason || `Kicked by ${admin.user.username} via Web Dashboard`);
      return { success: true };
  });

  // Timeout Member
  app.post('/:id/members/:memberId/timeout', {
      onRequest: [authenticate]
  }, async (req, reply) => {
      const { id, memberId } = req.params as { id: string, memberId: string };
      const { duration, reason } = req.body as { duration: number, reason?: string }; // Duration in seconds
      const guild = client.guilds.cache.get(id);
      
      if (!guild) return reply.code(404).send({ error: 'Guild not found' });
      
      const user = req.user as any;
      const admin = await guild.members.fetch(user.id).catch(() => null);
      
      if (!admin || !admin.permissions.has(PermissionFlagsBits.Administrator) && !admin.permissions.has(PermissionFlagsBits.ModerateMembers)) {
           return reply.code(403).send({ error: 'Unauthorized' });
      }

      const member = await guild.members.fetch(memberId).catch(() => null);
      if (!member) return reply.code(404).send({ error: 'Member not found' });

      if (!member.moderatable) return reply.code(400).send({ error: 'Bot cannot moderate this member (Role Hierarchy)' });

      // Max timeout 28 days
      if (duration > 28 * 24 * 60 * 60) return reply.code(400).send({ error: 'Timeout too long' });
      
      await member.timeout(duration * 1000, reason || `Timed out by ${admin.user.username} via Web Dashboard`);
      return { success: true };
  });
};