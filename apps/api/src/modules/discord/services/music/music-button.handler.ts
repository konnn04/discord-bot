/**
 * Music control button interaction handler.
 * Extracted from PlayerManager to keep the class focused on audio playback.
 */
import { EmbedBuilder, ButtonInteraction, MessageFlags } from 'discord.js';
import { getQueueManager } from './queue-manager';
import { getMusicApi } from './music-api.client';
import { createNowPlayingEmbed, createMusicButtons } from './now-playing-ui';
import type { PlayerManager } from './player-manager';

export async function handleMusicButton(
  pm: PlayerManager,
  interaction: ButtonInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  if (!pm.isConnected(guildId)) {
    await interaction.reply({
      content: '❌ Không có phiên nhạc nào.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const member = interaction.member as any;
  const userVoiceChannelId = member?.voice?.channelId;
  if (!userVoiceChannelId) {
    await interaction.reply({
      content: '❌ Bạn cần ở trong kênh thoại.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const qm = getQueueManager();

  switch (interaction.customId) {
    case 'music_pause': {
      if (pm.isPaused(guildId)) {
        pm.resume(guildId);
        const embed = createNowPlayingEmbed(
          guildId,
          false,
          pm.getElapsed(guildId),
        );
        const buttons = createMusicButtons(false, guildId);
        if (embed) {
          await interaction.update({
            embeds: [embed],
            components: [buttons],
          });
        } else {
          await interaction.deferUpdate();
        }
      } else {
        pm.pause(guildId);
        const embed = createNowPlayingEmbed(
          guildId,
          true,
          pm.getElapsed(guildId),
        );
        const buttons = createMusicButtons(true, guildId);
        if (embed) {
          await interaction.update({
            embeds: [embed],
            components: [buttons],
          });
        } else {
          await interaction.deferUpdate();
        }
      }
      break;
    }

    case 'music_skip': {
      const next = qm.skip(guildId, 1);
      if (next) {
        await interaction.deferUpdate();
        const gp = pm.getGuildPlayer(guildId);
        const result = await pm.playWithAutoSkip(
          guildId,
          gp?.client || undefined,
        );
        if (!result.success) {
          pm.stop(guildId);
          await pm.deleteNowPlayingPublic(guildId);
          const msg =
            result.autoSkippedCount > 0
              ? `⚠️ Đã bỏ qua nhưng ${result.autoSkippedCount + 1} bài tiếp theo bị lỗi. Hết queue rồi!`
              : '⚠️ Không thể phát bài tiếp theo. Hết queue rồi!';
          await interaction.followUp({
            content: msg,
            flags: MessageFlags.Ephemeral,
          });
        }
      } else {
        pm.stop(guildId);
        await pm.deleteNowPlayingPublic(guildId);
        await interaction.reply({
          content: '⏹️ Hết queue rồi!',
        });
      }
      break;
    }

    case 'music_prev': {
      const prevTrack = qm.prev(guildId);
      if (prevTrack) {
        await interaction.deferUpdate();
        const gp = pm.getGuildPlayer(guildId);
        const result = await pm.playWithAutoSkip(
          guildId,
          gp?.client || undefined,
        );
        if (!result.success) {
          await interaction.followUp({
            content: `⚠️ Không thể phát bài trước đó${result.autoSkippedCount > 0 ? ` (đã tự động bỏ qua ${result.autoSkippedCount} bài lỗi)` : ''}.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      } else {
        await interaction.reply({
          content: '❌ Không có bài trước đó.',
          flags: MessageFlags.Ephemeral,
        });
      }
      break;
    }

    case 'music_stop': {
      pm.stop(guildId);
      await pm.deleteNowPlayingPublic(guildId);
      await interaction.reply({
        content: '⏹️ Đã dừng phát nhạc.',
      });
      break;
    }

    case 'music_lyrics': {
      const current = qm.getCurrent(guildId);
      if (!current) {
        await interaction.reply({
          content: '❌ Không có bài đang phát.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply();

      try {
        const api = getMusicApi();
        const trackName = current.track.title;
        const artistName = current.track.artist || trackName;

        const result = await api.getLyrics(trackName, artistName);
        if (!result || !result.plainLyrics) {
          await interaction.editReply('❌ Không tìm thấy lời bài hát này.');
          return;
        }

        const { truncate } = await import('./utils');
        const lyricsText = truncate(result.plainLyrics, 3900);

        const embed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle(`📝 ${result.trackName}`)
          .setDescription(lyricsText)
          .setFooter({
            text: `${result.artistName}${result.albumName ? ` • ${result.albumName}` : ''}`,
          });

        await interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        console.error('[MusicButton] Lyrics Error:', error);
        await interaction.editReply(
          `❌ ${error.message || 'Không thể lấy lời bài hát.'}`,
        );
      }
      break;
    }

    default:
      await interaction.deferUpdate();
  }
}
