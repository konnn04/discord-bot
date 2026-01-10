import { FastifyInstance } from 'fastify';
import authRoutes from './auth';
import guildsRoutes from './guilds';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(guildsRoutes, { prefix: '/api/guilds' });
}