/**
 * Now-Playing UI helpers — embed & button builders.
 */
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getQueueManager } from './queue-manager';
import { formatDuration } from './utils';

/** Create the music control button row */
export function createMusicButtons(
  isPaused: boolean,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_prev')
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_lyrics')
      .setEmoji('🎤')
      .setStyle(ButtonStyle.Primary),
  );
}

/** Build the "Now Playing" embed for a guild */
export function createNowPlayingEmbed(
  guildId: string,
  isPaused: boolean,
  elapsed?: number,
): EmbedBuilder | null {
  const qm = getQueueManager();
  const current = qm.getCurrent(guildId);
  if (!current) return null;

  const total = current.track.duration;
  const e = elapsed ?? 0;
  const vol = qm.getVolume(guildId);
  const remaining = qm.remaining(guildId);
  const statusIcon = isPaused ? '⏸️' : '▶️';

  let timeString = '';
  if (isPaused) {
    timeString = `⏳ Đã dừng ở **${formatDuration(e)}** / ${formatDuration(total)}`;
  } else {
    const endTimestamp = Math.floor((Date.now() + (total - e) * 1000) / 1000);
    timeString = `⏳ Kết thúc <t:${endTimestamp}:R>`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x7c3aed)
    .setAuthor({ name: `${statusIcon} ${isPaused ? 'Tạm dừng' : 'Đang phát'}` })
    .setTitle(current.track.title)
    .setURL(current.track.url)
    .setDescription(
      `**${current.track.artist || 'Không rõ'}**${current.track.album ? ` • ${current.track.album}` : ''}\n\n` +
        `${timeString}\n\n` +
        `🔊 ${vol}% • 📋 Còn ${remaining} bài trong queue`,
    )
    .setThumbnail(current.track.thumbnail)
    .setFooter({ text: `Yêu cầu bởi ${current.requestedBy}` })
    .setTimestamp();

  const q = qm.get(guildId);
  if (q && q.current + 1 < q.tracks.length) {
    const next = q.tracks[q.current + 1];
    embed.addFields({
      name: '📋 Tiếp theo',
      value: `${next.track.title} — ${next.track.artist || 'Không rõ'} (${formatDuration(next.track.duration)})`,
    });
  }

  return embed;
}
