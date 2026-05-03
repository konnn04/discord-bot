import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder, ChannelType } from 'discord.js';

const endTracking: ActionCommand = {
  name: 'end_tracking',
  description: 'Kết thúc theo dõi cuộc họp kênh thoại',
  helpDescription: 'Dừng theo dõi cuộc họp và tạo báo cáo điểm danh.',
  category: 'meeting',
  permission: PermissionLevel.MODERATOR,
  optionalArgs: [
    {
      name: 'channel',
      description: 'Kênh thoại cần dừng theo dõi (mặc định: kênh hiện tại)',
      type: 'CHANNEL',
      channelTypes: [2, 13],
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    const meetingTracker = deps?.meetingTracker;

    if (!ctx.guild || !meetingTracker) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Lệnh này chỉ dùng được trong server'),
        ],
      });
      return;
    }

    const channelOption = ctx.getOption('channel', 'channel');
    let voiceChannel = channelOption;

    if (!voiceChannel) {
      voiceChannel = ctx.voiceChannel;
      if (!voiceChannel) {
        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setDescription(
                '❌ Bạn phải ở trong kênh thoại hoặc chỉ định kênh',
              ),
          ],
        });
        return;
      }
    }

    if (
      voiceChannel.type !== ChannelType.GuildVoice &&
      voiceChannel.type !== ChannelType.GuildStageVoice
    ) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              '❌ Kênh được chỉ định không phải kênh thoại/stage',
            ),
        ],
      });
      return;
    }

    const session = meetingTracker.getSession(voiceChannel.id);
    if (!session) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
              '❌ Không có phiên theo dõi nào đang hoạt động cho kênh này',
            ),
        ],
      });
      return;
    }

    const endedSession = await meetingTracker.endSession(voiceChannel.id);
    if (!endedSession) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription('❌ Không thể kết thúc phiên theo dõi'),
        ],
      });
      return;
    }

    const participants = Array.from(endedSession.participants.values()).sort(
      (a: any, b: any) => b.totalDuration - a.totalDuration,
    );
    const totalParticipants = participants.length;
    const avgDuration =
      totalParticipants > 0
        ? participants.reduce(
            (sum: number, p: any) => sum + p.totalDuration,
            0,
          ) / totalParticipants
        : 0;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Tóm tắt cuộc họp')
      .setDescription(`**${voiceChannel.name}**`)
      .addFields(
        {
          name: '👥 Tổng người tham gia',
          value: totalParticipants.toString(),
          inline: true,
        },
        {
          name: '⏱️ Thời gian TB',
          value: meetingTracker.formatDuration(avgDuration),
          inline: true,
        },
        {
          name: '🕐 Tổng thời gian',
          value: meetingTracker.formatDuration(
            Date.now() - endedSession.startTime,
          ),
          inline: true,
        },
      );

    if (totalParticipants > 0) {
      const display = participants.slice(0, 50);
      let list = '';
      for (let i = 0; i < display.length; i++) {
        const d = display[i] as any;
        list += `${i + 1}. **${d.displayName}** — ${meetingTracker.formatDuration(d.totalDuration)}\n`;
      }
      if (totalParticipants > 50)
        list += `\n*...và ${totalParticipants - 50} người khác*`;
      embed.addFields({ name: 'Danh sách', value: list });
    }

    embed.setTimestamp();
    await ctx.reply({ embeds: [embed] });

    // Send detailed report to initiator via DM
    try {
      let report = `**📋 Báo cáo cuộc họp: ${voiceChannel.name}**\n\n`;
      report += `Bắt đầu: <t:${Math.floor(endedSession.startTime / 1000)}:F>\n`;
      report += `Kết thúc: <t:${Math.floor((endedSession.endTime || Date.now()) / 1000)}:F>\n`;
      report += `Tổng: ${participants.length} người\n\n**Chi tiết:**\n\n`;

      for (const pt of participants) {
        const p = pt as any;
        report += `**${p.displayName}** (@${p.tag})\n`;
        report += `• Tổng: ${meetingTracker.formatDuration(p.totalDuration)} | Phiên: ${p.sessions.length}\n`;
        for (let i = 0; i < p.sessions.length; i++) {
          const s = p.sessions[i];
          const dur = s.leftAt
            ? s.leftAt - s.joinedAt
            : Date.now() - s.joinedAt;
          report += `  ${i + 1}. <t:${Math.floor(s.joinedAt / 1000)}:t> → <t:${Math.floor((s.leftAt || Date.now()) / 1000)}:t> (${meetingTracker.formatDuration(dur)})\n`;
        }
        report += '\n';
      }

      if (report.length > 2000) {
        const chunks: string[] = [];
        let current = '';
        for (const line of report.split('\n')) {
          if (current.length + line.length + 1 > 1900) {
            chunks.push(current);
            current = line + '\n';
          } else {
            current += line + '\n';
          }
        }
        if (current) chunks.push(current);
        for (const chunk of chunks) await ctx.user.send(chunk);
      } else {
        await ctx.user.send(report);
      }
    } catch {
      // DM might be disabled
    }
  },
};

export default endTracking;
