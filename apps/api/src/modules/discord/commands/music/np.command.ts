import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder } from 'discord.js';
import { getQueueManager } from '../../services/music/queue-manager';
import { getPlayerManager } from '../../services/music/player-manager';
import { formatDuration, createProgressBar } from '../../services/music/utils';

const np: ActionCommand = {
  name: 'np',
  description: 'Hiển thị bài nhạc đang phát',
  category: 'music',

  async execute(ctx: ContextAdapter) {
    const guildId = ctx.guildId;
    if (!guildId) return;

    const qm = getQueueManager();
    const pm = getPlayerManager();
    const current = qm.getCurrent(guildId);

    if (!current || !pm.isPlaying(guildId)) {
      await ctx.reply('❌ Không có bài nào đang phát.');
      return;
    }

    const elapsed = pm.getElapsed(guildId);
    const total = current.track.duration;
    const bar = createProgressBar(elapsed, total);
    const vol = qm.getVolume(guildId);
    const isPaused = pm.isPaused(guildId);

    const statusIcon = isPaused ? '⏸️' : '▶️';
    const remaining = qm.remaining(guildId);

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setAuthor({
        name: `${statusIcon} ${isPaused ? 'Tạm dừng' : 'Đang phát'}`,
      })
      .setTitle(current.track.title)
      .setURL(current.track.url)
      .setDescription(
        `**${current.track.artist || 'Không rõ'}**${current.track.album ? ` • ${current.track.album}` : ''}\n\n` +
          `${bar}\n` +
          `${formatDuration(elapsed)} / ${formatDuration(total)}\n\n` +
          `🔊 ${vol}% • 📋 Còn ${remaining} bài trong queue`,
      )
      .setThumbnail(current.track.thumbnail)
      .setFooter({ text: `Yêu cầu bởi ${current.requestedBy}` })
      .setTimestamp();

    // Show next track if available
    const q = qm.get(guildId);
    if (q && q.current + 1 < q.tracks.length) {
      const next = q.tracks[q.current + 1];
      embed.addFields({
        name: '📋 Tiếp theo',
        value: `${next.track.title} — ${next.track.artist || 'Không rõ'} (${formatDuration(next.track.duration)})`,
      });
    }

    await ctx.reply({ embeds: [embed] });
  },
};

export default np;
