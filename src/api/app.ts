import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BotClient } from '../bot/types/bot.types';
import { config } from '../config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { registerRoutes } from './routes';

export async function createApp(botClient: BotClient, db: any) {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: config.jwt.secret });

  app.decorate('discordBot', botClient);
  app.decorate('db', db);

  await app.register(import('fastify-socket.io'), {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  await app.register(import('@fastify/static'), {
    root: path.join(__dirname, '../../web/dist'),
    prefix: '/',
  });

  await registerRoutes(app);

  app.setNotFoundHandler(async (req, reply) => {
    if (req.raw.url && req.raw.url.startsWith('/api')) {
      return reply.code(404).send({ error: 'Not Found' });
    }
    return reply.sendFile('index.html');
  });

  await app.ready();
  if (app.io) {
    const { SocketService } = await import('../services/SocketService');
    SocketService.init(app.io);
  }

  return app;
}