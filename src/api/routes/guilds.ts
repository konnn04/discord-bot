import { FastifyInstance } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';

interface AppWithBot extends FastifyInstance {
  bot: BotClient;
}

export default async function guildsRoutes(app: FastifyInstance) {
  const { bot } = app as AppWithBot;

  // Get all guilds
  app.get('/', async (request, reply) => {
    const guilds = bot.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
    }));
    
    return guilds;
  });

  // Get guild by ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const guild = bot.guilds.cache.get(id);
    
    if (!guild) {
      return reply.status(404).send({ error: 'Guild not found' });
    }
    
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      channels: guild.channels.cache.size,
      roles: guild.roles.cache.size,
    };
  });
}