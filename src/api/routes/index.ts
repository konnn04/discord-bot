import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { guildsRoutes } from './guilds';
import { globalApiRoutes } from './global';
import { musicRoutes } from './music';
import { commandsRoutes } from './commands';
import { adminRoutes } from './admin';
import { usersRoutes } from './users';

export async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(guildsRoutes, { prefix: '/api/guilds' });
  app.register(usersRoutes, { prefix: '/api/users' });
  app.register(globalApiRoutes, { prefix: '/global_api' });
  app.register(musicRoutes, { prefix: '/api/music' });
  app.register(commandsRoutes, { prefix: '/api/commands' });
  app.register(adminRoutes, { prefix: '/api/admin' });
}