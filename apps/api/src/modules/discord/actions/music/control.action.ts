import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';
import { getPlayerManager } from '../../services/music/player-manager';
import { getQueueManager } from '../../services/music/queue-manager';
import { formatDuration } from '../../services/music/utils';

// ── Skip ────────────────────────────────────────────────────────────────────

export const skipMusicToolSchema: ToolSchema = {
  name: 'skip_music',
  description: 'Bỏ qua bài đang phát và phát bài tiếp theo trong hàng chờ.',
  parameters: {
    type: 'object',
    properties: {
      count: { type: 'number', description: 'Số bài muốn bỏ qua (mặc định 1)' },
    },
  },
};

export async function skipMusicAction(
  ctx: ActionContext,
  args: { count?: number },
): Promise<ActionResult> {
  const pm = getPlayerManager();
  const qm = getQueueManager();
  if (!pm.isPlaying(ctx.guild.id)) return fail('Không có bài nào đang phát.');

  const n = Math.max(1, Number(args.count) || 1);
  const next = qm.skip(ctx.guild.id, n);
  if (!next) return fail('Đã hết hàng chờ.');

  const result = await pm.playWithAutoSkip(ctx.guild.id, ctx.client);
  if (!result.success) {
    pm.stop(ctx.guild.id);
    return fail('Không phát được bài tiếp theo. Hết hàng chờ rồi!');
  }
  const nowPlaying = qm.getCurrent(ctx.guild.id);
  return ok(
    `Đã bỏ qua ${n} bài. Đang phát: ${nowPlaying?.track.title ?? next.track.title}`,
  );
}

// ── Pause / Resume / Stop ────────────────────────────────────────────────────

export const pauseMusicToolSchema: ToolSchema = {
  name: 'pause_music',
  description: 'Tạm dừng nhạc đang phát.',
  parameters: { type: 'object', properties: {} },
};

export function pauseMusicAction(ctx: ActionContext): ActionResult {
  return getPlayerManager().pause(ctx.guild.id)
    ? ok('Đã tạm dừng nhạc.')
    : fail('Không có bài nào đang phát.');
}

export const resumeMusicToolSchema: ToolSchema = {
  name: 'resume_music',
  description: 'Tiếp tục phát nhạc đang tạm dừng.',
  parameters: { type: 'object', properties: {} },
};

export function resumeMusicAction(ctx: ActionContext): ActionResult {
  return getPlayerManager().resume(ctx.guild.id)
    ? ok('Đã tiếp tục phát nhạc.')
    : fail('Không có nhạc nào đang tạm dừng.');
}

export const stopMusicToolSchema: ToolSchema = {
  name: 'stop_music',
  description: 'Dừng nhạc và xoá hàng chờ.',
  parameters: { type: 'object', properties: {} },
};

export function stopMusicAction(ctx: ActionContext): ActionResult {
  const pm = getPlayerManager();
  if (!pm.isPlaying(ctx.guild.id) && !pm.isConnected(ctx.guild.id)) {
    return fail('Không có nhạc nào đang phát.');
  }
  getQueueManager().clear(ctx.guild.id);
  pm.stop(ctx.guild.id);
  return ok('Đã dừng nhạc và xoá hàng chờ.');
}

// ── Now playing ──────────────────────────────────────────────────────────────

export const nowPlayingToolSchema: ToolSchema = {
  name: 'now_playing',
  description: 'Xem bài nhạc đang phát.',
  parameters: { type: 'object', properties: {} },
};

export function nowPlayingAction(ctx: ActionContext): ActionResult {
  const qm = getQueueManager();
  const pm = getPlayerManager();
  const current = qm.getCurrent(ctx.guild.id);
  if (!current || !pm.isPlaying(ctx.guild.id)) {
    return fail('Không có bài nào đang phát.');
  }
  const status = pm.isPaused(ctx.guild.id) ? '⏸️ Tạm dừng' : '▶️ Đang phát';
  const remaining = qm.remaining(ctx.guild.id);
  return ok(
    `${status}: ${current.track.title} — ${current.track.artist || 'Không rõ'} ` +
      `(${formatDuration(current.track.duration)}). Còn ${remaining} bài trong hàng chờ.`,
  );
}
