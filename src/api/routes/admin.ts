import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from '../../config/env';
import { BotClient } from '../../bot/types/bot.types';
import { authenticate } from '@api/middleware/auth';

export const adminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  app.addHook('onRequest', authenticate);
  app.addHook('onRequest', async (req, reply) => {
      const user = req.user as any;
      if (!config.developerId.includes(user.id)) {
          return reply.code(403).send({ error: 'Unauthorized: Developer access required' });
      }
  });

  app.get('/stats', async (req, reply) => {
      const memoryUsage = process.memoryUsage();
      return {
          guilds: client.guilds.cache.size,
          users: client.users.cache.size,
          uptime: client.uptime,
          memory: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          nodeVersion: process.version,
          platform: process.platform
      };
  });
};
