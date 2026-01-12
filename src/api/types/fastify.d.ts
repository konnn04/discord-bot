import { BotClient } from '../../bot/types/bot.types';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  export interface FastifyInstance {
    discordBot: BotClient;
  }
}
