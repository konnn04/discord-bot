import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';
import { PermissionFlagsBits } from 'discord.js';
import { authenticate } from '@api/middleware/auth';

export const usersRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  // Simple in-memory cache
  const guildCache = new Map<string, { data: any[], expires: number }>();
  const CACHE_TTL = 30 * 1000; // 30 seconds

  // Get user's guilds (mutual with bot)
  app.get('/@me/guilds', {
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
                 if (cached) return cached.data;
                 throw new Error('Rate Limited by Discord');
            }
            throw new Error(`Discord API Error: ${response.status} ${response.statusText}`);
        }

        const userGuilds = await response.json() as any[];
        
        // Filter guilds where bot is also present
        const mutualGuilds = userGuilds.filter(g => client.guilds.cache.has(g.id)).map(g => {
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
        console.error('Users Route Error:', err);
        const errorMessage = err.message || 'Internal Server Error';
        return reply.code(500).send({ error: errorMessage });
    }
  });
};
