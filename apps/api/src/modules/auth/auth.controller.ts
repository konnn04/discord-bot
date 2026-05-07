import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { discordClientRef } from '../discord/discord.service';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Get('login')
  login(@Req() req: Request, @Res() res: Response) {
    const envDomain =
      process.env.CUSTOM_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN;
    let baseUrl = '';
    if (envDomain) {
      baseUrl = envDomain.startsWith('http')
        ? envDomain
        : `https://${envDomain}`;
    } else {
      const protocol =
        (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const host =
        (req.headers['x-forwarded-host'] as string) || req.get('host');
      baseUrl = `${protocol}://${host}`;
    }
    const redirectUri = `${baseUrl}/api/auth/callback`;

    const url = this.authService.getAuthUrl(redirectUri);
    return res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!code) {
      throw new UnauthorizedException('Missing OAuth2 code');
    }

    const envDomain =
      process.env.CUSTOM_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN;
    let baseUrl = '';
    if (envDomain) {
      baseUrl = envDomain.startsWith('http')
        ? envDomain
        : `https://${envDomain}`;
    } else {
      const protocol =
        (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const host =
        (req.headers['x-forwarded-host'] as string) || req.get('host');
      baseUrl = `${protocol}://${host}`;
    }
    const redirectUri = `${baseUrl}/api/auth/callback`;

    const tokenData = await this.authService.exchangeCode(code, redirectUri);

    const user = await this.authService.getDiscordUser(tokenData.access_token);

    const jwt = this.authService.generateJwt(user, tokenData.access_token);

    return res.redirect(`/?token=${jwt}`);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: Request) {
    const payload = (req as any).user;
    const user = await this.authService.getDiscordUser(payload.accessToken);
    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
    };
  }

  @Get('guilds')
  @UseGuards(AuthGuard)
  async guilds(
    @Req() req: Request,
  ): Promise<{ success: boolean; data: any[] }> {
    const payload = (req as any).user;
    const guilds = await this.authService.getDiscordGuilds(payload.accessToken);
    return {
      success: true,
      data: guilds,
    };
  }

  /** Spotify OAuth callback — stores token for /spotify_my */
  @Get('spotify/callback')
  async spotifyCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      return res.send('<h3>❌ Thiếu code hoặc state.</h3>');
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri =
      process.env.SPOTIFY_REDIRECT_URI ||
      `${process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : 'http://localhost:3000'}/api/auth/spotify/callback`;

    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });
      const json = await tokenRes.json();
      if (!json.access_token)
        throw new Error(json.error_description || 'Token exchange failed');

      await this.prisma.client.spotifyToken.upsert({
        where: { userId: state },
        create: {
          userId: state,
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
          expiresAt: new Date(Date.now() + json.expires_in * 1000),
        },
        update: {
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
          expiresAt: new Date(Date.now() + json.expires_in * 1000),
        },
      });

      // DM user on success
      const client = discordClientRef.client;
      if (client) {
        try {
          const user = await client.users.fetch(state).catch(() => null);
          if (user) {
            await user.send(
              '✅ **Đăng nhập Spotify thành công!**\nDùng `/spotify` để mở menu hoặc `/spotify_my` để xem playlist của bạn.',
            );
          }
        } catch {
          /* DMs closed */
        }
      }

      return res.send(
        '<h3>✅ Đăng nhập Spotify thành công! Quay lại Discord.</h3>',
      );
    } catch (err: any) {
      return res.send(`<h3>❌ Lỗi: ${err.message}</h3>`);
    }
  }
}
