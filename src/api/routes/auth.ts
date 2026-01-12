import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from '../../config/env';
import { BotClient } from '../../bot/types/bot.types';
import { authenticate } from '@api/middleware/auth';
import { User } from '../../shared/types/api.types';

const DISCORD_API_URL = 'https://discord.com/api/v10';
const HOST = config.server.host === '0.0.0.0' ? 'localhost' : config.server.host;
const REDIRECT_URI = `${process.env.APP_URL || `http://${HOST}:${config.server.port}`}/api/auth/callback`;

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const client = app.discordBot as BotClient;

  // Login: Redirect to Discord
  app.get('/login', async (req, reply) => {
    const params = new URLSearchParams({
      client_id: config.discord.clientId,
      scope: 'identify guilds', 
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      prompt: 'none',
    });

    const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
    return reply.redirect(url);
  });

  // Callback: Exchange code for token
  app.get('/callback', async (req, reply) => {
    const { code } = req.query as { code: string };

    if (!code) {
      return reply.code(400).send({ error: 'No code provided' });
    }

    try {
      // Exchange code for token
      const tokenResponse = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.discord.clientId,
          client_secret: config.discord.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      if (!tokenResponse.ok) {
        const err = await tokenResponse.json();
        console.error('OAuth Token Error:', err);
        return reply.code(400).send({ error: 'Failed to authenticate with Discord' });
      }

      const tokenData = await tokenResponse.json() as any;
      const accessToken = tokenData.access_token;

      // Get User Info
      const userResponse = await fetch(`${DISCORD_API_URL}/users/@me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userResponse.ok) {
        return reply.code(400).send({ error: 'Failed to fetch user info' });
      }

      const userData = await userResponse.json() as any;

      // Create JWT
      const token = app.jwt.sign({
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
        accessToken,
      });

      const frontendUrl = process.env.APP_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?token=${token}`);

    } catch (error) {
      console.error('Auth Error:', error);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  // Me: Get current user info (Verify JWT)
  app.get('/me', {
    onRequest: [authenticate]
  }, async (req, reply) => {
    const user = req.user as User;
    const isDeveloper = config.developerId.includes(user.id);
    return { ...user, isDeveloper };
  });
};