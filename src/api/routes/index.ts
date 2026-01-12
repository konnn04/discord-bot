import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { guildsRoutes } from './guilds';
import { globalApiRoutes } from './global';
import { musicRoutes } from './music';

export async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(guildsRoutes, { prefix: '/api/guilds' });
  app.register(globalApiRoutes, { prefix: '/global_api' });
  app.register(musicRoutes, { prefix: '/api/music' });
}