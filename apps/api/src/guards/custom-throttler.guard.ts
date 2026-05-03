import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

/**
 * Custom throttler guard that applies different rate limits
 * based on whether the request is authenticated or not.
 *
 * Authenticated:  5 req/1s,  30 req/30s
 * Public:         3 req/1s,  15 req/30s,  30 req/60s
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user;
    if (user?.id) {
      return `user:${await user.id}`;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context } = requestProps;
    const req = context.switchToHttp().getRequest();
    const isAuthenticated = !!req.user?.id;

    const throttlers = isAuthenticated
      ? [
          { name: 'short', ttl: 1000, limit: 5 },
          { name: 'medium', ttl: 30000, limit: 30 },
        ]
      : [
          { name: 'short', ttl: 1000, limit: 3 },
          { name: 'medium', ttl: 30000, limit: 15 },
          { name: 'long', ttl: 60000, limit: 30 },
        ];

    const tracker = await this.getTracker(req);

    for (const throttler of throttlers) {
      const key = this.generateKey(context, tracker, throttler.name);
      const { totalHits, timeToExpire } = await this.storageService.increment(
        key,
        throttler.ttl,
        throttler.limit,
        0,
        throttler.name,
      );

      if (totalHits > throttler.limit) {
        const res = context.switchToHttp().getResponse();
        res.header('Retry-After', Math.ceil(timeToExpire / 1000));
        res.header('X-RateLimit-Limit', throttler.limit);
        res.header('X-RateLimit-Remaining', 0);
        await this.throwThrottlingException(context, {
          limit: throttler.limit,
          ttl: throttler.ttl,
          key,
          tracker,
          totalHits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: timeToExpire,
        });
      }

      const res = context.switchToHttp().getResponse();
      res.header(`X-RateLimit-Limit-${throttler.name}`, throttler.limit);
      res.header(
        `X-RateLimit-Remaining-${throttler.name}`,
        Math.max(0, throttler.limit - totalHits),
      );
    }

    return true;
  }
}
