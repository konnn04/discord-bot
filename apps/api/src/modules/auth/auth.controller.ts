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
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
}
