import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { guildsRoutes } from './guilds';
import { globalApiRoutes } from './global';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(guildsRoutes, { prefix: '/api/guilds' });
  await app.register(globalApiRoutes, { prefix: '/global_api' });
}