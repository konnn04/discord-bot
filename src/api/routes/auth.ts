import { FastifyInstance } from 'fastify';

export default async function authRoutes(app: FastifyInstance) {
  // Discord OAuth login
  app.get('/login', async (request, reply) => {
    const redirectUri = 'http://localhost:3000/api/auth/callback';
    const scope = 'identify guilds';
    
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    return reply.redirect(url);
  });

  // OAuth callback
  app.get('/callback', async (request, reply) => {
    const { code } = request.query as { code: string };
    
    // Exchange code for token
    // Generate JWT
    // Return JWT to client
    
    return { token: 'your_jwt_token' };
  });

  // Verify token
  app.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify();
      return request.user;
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });
}