import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { BotClient } from '../bot/types/bot.types';
import { config } from '../config/env';
import { registerRoutes } from './routes';

export async function createApp(botClient: BotClient) {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: config.jwt.secret });

  app.decorate('bot', botClient);

  await registerRoutes(app);

  return app;
}