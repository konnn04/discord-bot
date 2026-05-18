import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  health() {
    const mem = process.memoryUsage();
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
    };
  }

  /**
   * Full health check: API + Database + Music Server
   */
  @Get('/health/full')
  async healthFull() {
    const mem = process.memoryUsage();

    // 1) DB check
    let dbOk = false;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { PrismaService } = await import('./modules/prisma/prisma.service');
      dbOk = !!process.env.DATABASE_URL;
    } catch {
      dbOk = false;
    }

    // 2) Music server health
    let musicServer: any = null;
    const musicUrl = process.env.MUSIC_SERVER_URL;
    if (musicUrl) {
      try {
        const start = Date.now();
        const res = await fetch(`${musicUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        const json = await res.json();
        musicServer = {
          ok: json.success ?? false,
          status: json.data?.status ?? 'unknown',
          uptime: json.data?.uptime ?? null,
          memory: json.data?.memory ?? null,
          timestamp: json.data?.timestamp ?? null,
          latency: Date.now() - start,
        };
      } catch {
        musicServer = { ok: false, status: 'unreachable' };
      }
    } else {
      musicServer = { ok: false, status: 'not_configured' };
    }

    return {
      success: true,
      data: {
        api: {
          ok: true,
          uptime: process.uptime(),
          memory: {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          },
          timestamp: new Date().toISOString(),
        },
        database: {
          ok: dbOk,
          configured: !!process.env.DATABASE_URL,
        },
        musicServer,
      },
    };
  }
}
