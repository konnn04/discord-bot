import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
};