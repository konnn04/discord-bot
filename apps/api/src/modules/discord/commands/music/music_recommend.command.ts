import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { getMusicApi } from '../../services/music/music-api.client';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';

const musicRecommend: ActionCommand = {
  name: 'music_recommend',
  description: 'Gợi ý bài hát dựa trên bài đang phát và thêm vào queue',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const qm = getQueueManager();
    const pm = getPlayerManager();
    const current = qm.getCurrent(guildId);

    if (!current) {
      await ctx.reply('❌ Không có bài đang phát để lấy gợi ý.');
      return;
    }

    await ctx.defer();

    const api = getMusicApi();

    try {
      // Recommendations work best with Spotify track IDs
      // If current track is YouTube, try to search on Spotify first
      let trackId = '';
      if (current.track.source === 'spotify') {
        trackId = current.track.sourceId;
      } else {
        // Search on Spotify to get a Spotify ID
        const spotifyResults = await api.search(
          `${current.track.title} ${current.track.artist}`,
          'spotify',
          1,
        );
        if (spotifyResults.length > 0) {
          trackId = spotifyResults[0].sourceId;
        }
      }

      if (!trackId) {
        await ctx.editReply(
          '❌ Không tìm được track ID trên Spotify để lấy gợi ý.',
        );
        return;
      }

      const recommendations = await api.getRecommendations(trackId);

      if (!recommendations || recommendations.length === 0) {
        await ctx.editReply('❌ Không tìm thấy gợi ý nào.');
        return;
      }

      // Resolve all to YouTube and add to queue
      const added: string[] = [];
      for (const rec of recommendations.slice(0, 20)) {
        let ytId = '';
        if (rec.source === 'youtube') {
          ytId = rec.sourceId;
        } else {
          try {
            const resolved = await api.resolve(rec.sourceId);
            ytId = resolved.youtube.sourceId;
          } catch {
            continue;
          }
        }
        if (ytId) {
          qm.addTrack(guildId, ctx.channelId!, {
            track: rec,
            youtubeId: ytId,
            requestedBy: ctx.author.username,
            requestedById: ctx.userId,
          });
          added.push(`${rec.title} — ${rec.artist}`);
        }
      }

      if (added.length === 0) {
        await ctx.editReply('❌ Không thể resolve bài gợi ý nào.');
        return;
      }

      // If not playing, start playing
      if (!pm.isPlaying(guildId)) {
        const voiceChannel = ctx.voiceChannel;
        if (voiceChannel) {
          pm.join(voiceChannel);
          const q = qm.get(guildId)!;
          q.current = q.tracks.length - added.length;
          await pm.play(guildId, ctx.client);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle(`🎶 Đã thêm ${added.length} bài gợi ý vào queue`)
        .setDescription(
          `Dựa trên: **${current.track.title}** — ${current.track.artist}\n\n` +
            added
              .slice(0, 10)
              .map((a, i) => `${i + 1}. ${a}`)
              .join('\n') +
            (added.length > 10 ? `\n...và ${added.length - 10} bài khác` : ''),
        );

      await ctx.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error('[music_recommend] Error:', error);
      await ctx.editReply(`❌ Lỗi: ${error.message || 'Không thể lấy gợi ý.'}`);
    }
  },
};

export default musicRecommend;
