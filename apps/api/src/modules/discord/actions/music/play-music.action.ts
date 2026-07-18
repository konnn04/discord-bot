import type { QueueTrack } from 'shared/src/types/music.types';
import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';
import { getMusicApi } from '../../services/music/music-api.client';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { getSpeakManager } from '../../services/speak/speak-manager';
import { isUrl } from '../../services/music/utils';

export const playMusicToolSchema: ToolSchema = {
  name: 'play_music',
  description:
    'Phát nhạc theo từ khoá (tên nghệ sĩ + tên bài) trong kênh thoại của người ' +
    'yêu cầu. Muốn thêm nhiều bài cùng lúc thì liệt kê từng bài cách nhau bằng ' +
    'dấu chấm phẩy ";", ví dụ "Sơn Tùng M-TP - Chúng Ta Của Hiện Tại; Đen - Lối Nhỏ".',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Link nhạc, hoặc 1-10 bài hát dạng "nghệ sĩ - tên bài" cách nhau bằng dấu chấm phẩy ";"',
      },
    },
    required: ['query'],
  },
};

export interface PlayMusicData {
  /** Whether playback was started now (vs. queued behind current track). */
  startedPlaying: boolean;
  added: QueueTrack[];
  totalAdded: number;
  /** 1-based position in queue when added behind the current track. */
  queuePosition: number | null;
}

const MAX_QUERIES = 10;

/**
 * Split "Artist A - Song A; Artist B - Song B" into individual search queries.
 * Semicolon (not comma) is the separator — artist/song names legitimately
 * contain commas, so comma-splitting would mangle them.
 */
function splitQueries(raw: string): string[] {
  return raw
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_QUERIES);
}

/**
 * Resolve one keyword search to a track, preferring Spotify (better matches
 * "artist + title" searches than raw YouTube full-text search). Falls back to
 * the music server's generic search if Spotify has no result for the query.
 */
async function resolveKeyword(
  api: ReturnType<typeof getMusicApi>,
  query: string,
  requestedBy: string,
  requestedById: string,
): Promise<QueueTrack | null> {
  try {
    const spotifyResults = await api.search(query, 'spotify', 1);
    const track = spotifyResults[0];
    if (track) {
      const item: QueueTrack = { track, youtubeId: undefined, requestedBy, requestedById };
      // Resolve a playable YouTube id in the background, same as the URL/playlist path.
      api
        .resolve(track.sourceId)
        .then((r) => (item.youtubeId = r.youtube.sourceId))
        .catch(() => {});
      return item;
    }
  } catch {
    // fall through to generic search below
  }

  try {
    const result = await api.searchAndResolve(query);
    return {
      track: result.track,
      youtubeId: result.youtubeId,
      requestedBy,
      requestedById,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a query (URL, playlist, or one-to-many keyword searches), add it to
 * the guild's queue and start playback if idle. Shared by the /play command
 * and the chatbot tool.
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
      // Keyword search — may contain multiple songs separated by commas/newlines.
      const keywords = splitQueries(query);
      const resolved = await Promise.all(
        keywords.map((k) => resolveKeyword(api, k, requestedBy, requestedById)),
      );
      for (const item of resolved) {
        if (item) tracksToAdd.push(item);
      }
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
      const message =
        totalAdded === 1
          ? `Đã thêm và phát: ${tracksToAdd[0].track.title}`
          : `Đã thêm ${totalAdded} bài và bắt đầu phát: ${tracksToAdd[0].track.title}`;
      return ok(message, {
        startedPlaying: true,
        added: tracksToAdd,
        totalAdded,
        queuePosition: null,
      });
    }

    const queuePosition = qm.get(guildId)!.tracks.length;
    const message =
      totalAdded === 1
        ? `Đã thêm vào hàng đợi: ${tracksToAdd[0].track.title}`
        : `Đã thêm ${totalAdded} bài vào hàng đợi, bắt đầu từ: ${tracksToAdd[0].track.title}`;
    return ok(message, {
      startedPlaying: false,
      added: tracksToAdd,
      totalAdded,
      queuePosition,
    });
  } catch (error: any) {
    return fail(`Lỗi: ${error?.message || 'Không thể xử lý yêu cầu.'}`);
  }
}
