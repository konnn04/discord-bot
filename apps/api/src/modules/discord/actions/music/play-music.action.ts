import type { QueueTrack } from 'shared/src/types/music.types';
import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

export const playMusicToolSchema: ToolSchema = {
  name: 'play_music',
  description: 'Phát nhạc theo từ khoá trong kênh thoại của người yêu cầu.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Từ khoá hoặc tên bài hát' },
    },
    required: ['query'],
  },
};
import { getMusicApi } from '../../services/music/music-api.client';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { getSpeakManager } from '../../services/speak/speak-manager';
import { isUrl } from '../../services/music/utils';

export interface PlayMusicData {
  /** Whether playback was started now (vs. queued behind current track). */
  startedPlaying: boolean;
  added: QueueTrack[];
  totalAdded: number;
  /** 1-based position in queue when added behind the current track. */
  queuePosition: number | null;
}

/**
 * Resolve a query (URL, playlist, or keyword), add it to the guild's queue and
 * start playback if idle. Shared by the /play command and the chatbot tool.
 */
export async function playMusicAction(
  ctx: ActionContext,
  args: { query: string },
): Promise<ActionResult<PlayMusicData>> {
  const query = String(args.query || '').trim();
  if (!query) return fail('Vui lòng nhập link hoặc từ khóa tìm kiếm.');

  if (getSpeakManager().isActive(ctx.guild.id)) {
    return fail(
      'Bot đang đọc chat (/speak). Dùng `/stop_speak` trước khi phát nhạc.',
    );
  }

  const voiceChannel = ctx.voiceChannel ?? ctx.actor?.voice?.channel ?? null;
  if (!voiceChannel) return fail('Bạn cần vào một kênh thoại trước!');

  const api = getMusicApi();
  if (!api.isConfigured()) return fail('Music server chưa được cấu hình.');

  const requestedBy = ctx.actor?.user.username ?? 'Unknown';
  const requestedById = ctx.actor?.id ?? '';
  const guildId = ctx.guild.id;
  const textChannelId = ctx.textChannelId ?? '';

  const qm = getQueueManager();
  const pm = getPlayerManager();

  try {
    const tracksToAdd: QueueTrack[] = [];

    if (isUrl(query)) {
      const parsed = await api.parseUrl(query);
      if (parsed.type === 'track') {
        const trackData = parsed.data as any;
        tracksToAdd.push({
          track: trackData,
          youtubeId:
            trackData.source === 'youtube' ? trackData.sourceId : undefined,
          requestedBy,
          requestedById,
        });
        if (trackData.source === 'spotify') {
          api
            .resolve(trackData.sourceId)
            .then((r) => (tracksToAdd[0].youtubeId = r.youtube.sourceId))
            .catch(() => {});
        }
      } else if (parsed.type === 'playlist' || parsed.type === 'album') {
        const items = Array.isArray(parsed.data)
          ? parsed.data
          : (parsed.data as any).tracks || [];
        const limited = items.slice(0, 50);
        for (const item of limited) {
          tracksToAdd.push({
            track: item,
            youtubeId: item.source === 'youtube' ? item.sourceId : undefined,
            requestedBy,
            requestedById,
          });
        }
        const spotifyIds = limited
          .filter((t: any) => t.source === 'spotify')
          .map((t: any) => t.sourceId);
        if (spotifyIds.length > 0) {
          api
            .resolveMany(spotifyIds)
            .then((results) => {
              for (const t of tracksToAdd) {
                if (t.track.source === 'spotify' && !t.youtubeId) {
                  const r = results.get(t.track.sourceId);
                  if (r) t.youtubeId = r.youtube.sourceId;
                }
              }
            })
            .catch(() => {});
        }
      }
    } else {
      const result = await api.searchAndResolve(query);
      tracksToAdd.push({
        track: result.track,
        youtubeId: result.youtubeId,
        requestedBy,
        requestedById,
      });
    }

    if (tracksToAdd.length === 0) {
      return fail('Không tìm thấy bài hát nào.');
    }

    const totalAdded = tracksToAdd.length;
    const wasEmpty = !qm.getCurrent(guildId);
    const isCurrentlyPlaying = pm.isPlaying(guildId);

    qm.addTracks(guildId, textChannelId, tracksToAdd);

    if (wasEmpty || !isCurrentlyPlaying) {
      const q = qm.get(guildId)!;
      q.current = q.tracks.length - tracksToAdd.length;
      pm.join(voiceChannel);
      // Fire-and-forget: the player auto-skips failed tracks and logs errors.
      pm.playWithAutoSkip(guildId, ctx.client).catch((err) =>
        console.error('[play-music.action] playback error:', err),
      );
      return ok(`Đã thêm và phát: ${tracksToAdd[0].track.title}`, {
        startedPlaying: true,
        added: tracksToAdd,
        totalAdded,
        queuePosition: null,
      });
    }

    const queuePosition = qm.get(guildId)!.tracks.length;
    return ok(`Đã thêm vào hàng đợi: ${tracksToAdd[0].track.title}`, {
      startedPlaying: false,
      added: tracksToAdd,
      totalAdded,
      queuePosition,
    });
  } catch (error: any) {
    return fail(`Lỗi: ${error?.message || 'Không thể xử lý yêu cầu.'}`);
  }
}
