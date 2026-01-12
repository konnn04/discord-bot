import dotenv from 'dotenv';
import path from 'path';
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
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
  },
  youtube: {
    binDir: process.env.YOUTUBE_BIN_DIR || path.join(process.cwd(), 'bin'),
    cookiesPath: process.env.YOUTUBE_COOKIES_PATH || path.join(process.cwd(), 'bin', 'yt.txt'),
    userAgent: process.env.YOUTUBE_USER_AGENT!,
  },
  youtubeMusic: {
    cookiesPath: process.env.YOUTUBE_MUSIC_COOKIES_PATH || path.join(process.cwd(), 'bin', 'yt-music.txt'),
    userAgent: process.env.YOUTUBE_MUSIC_USER_AGENT!,
    gl: process.env.YOUTUBE_MUSIC_GL! || 'US',
    hl: process.env.YOUTUBE_MUSIC_HL! || 'en',
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
};