import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { BotClient } from '../../bot/types/bot.types';

export const commandsRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  app.get('/', async (req, reply) => {
    // Map collection to array
    const commands = Array.from(client.actionCommands.values()).map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      cooldown: cmd.cooldown,
      options: cmd.optionalArgs || []
    }));
    return commands;
  });
};
