import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokenPayload } from 'shared/src/types/api.types';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name: string | null;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private config: ConfigService,
    private jwtService: JwtService,
  ) {}

  /** Get Discord OAuth2 authorization URL */
  getAuthUrl(redirectUri: string): string {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const scope = encodeURIComponent('identify guilds');
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
  }

  /** Exchange OAuth2 code for Discord access token */
  async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<DiscordTokenResponse> {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.config.get<string>('DISCORD_CLIENT_SECRET');

    const body = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Discord token exchange failed: ${error}`);
      throw new UnauthorizedException('Failed to exchange OAuth2 code');
    }

    return res.json() as Promise<DiscordTokenResponse>;
  }

  /** Get Discord user info using access token */
  async getDiscordUser(accessToken: string): Promise<DiscordUser> {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new UnauthorizedException('Failed to fetch Discord user');
    }

    return res.json() as Promise<DiscordUser>;
  }

  /** Get Discord guilds for a user */
  async getDiscordGuilds(accessToken: string): Promise<DiscordGuild[]> {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new UnauthorizedException('Failed to fetch Discord guilds');
    }

    return res.json() as Promise<DiscordGuild[]>;
  }

  /** Generate JWT token from Discord user */
  generateJwt(user: DiscordUser, accessToken: string): string {
    const payload: AuthTokenPayload = {
      sub: user.id,
      username: user.username,
      avatar: user.avatar,
      accessToken,
    };

    return this.jwtService.sign(payload);
  }

  /** Verify and decode JWT token */
  verifyJwt(token: string): AuthTokenPayload {
    try {
      return this.jwtService.verify<AuthTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
