import type { ActionCommand } from 'shared/src/types/discord.types';
import { PermissionLevel } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder, ChannelType } from 'discord.js';
import {
  MeetingTracker,
  MeetingSession,
  MeetingParticipant,
} from '../../utils/meeting-tracker';

const startTracking: ActionCommand = {
  name: 'start_tracking',
  description: 'Bắt đầu theo dõi cuộc họp trong kênh thoại',
  helpDescription:
    'Theo dõi người tham gia trong kênh thoại. Ghi lại thời gian tham gia/rời đi và tạo báo cáo khi kết thúc.',
  category: 'meeting',
  permission: PermissionLevel.MODERATOR,
  optionalArgs: [
    {
      name: 'channel',
      description: 'Kênh thoại cần theo dõi (mặc định: kênh hiện tại của bạn)',
      type: 'CHANNEL',
      channelTypes: [2, 13],
      required: false,
    },
    {
      name: 'duration',
      description: 'Thời gian theo dõi (phút, mặc định: 60)',
      type: 'INTEGER',
      minValue: 1,
      maxValue: 1440,
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter, deps?: any) {
    if (!ctx.guild || !deps?.meetingTracker) {
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
    const durationMinutes =
      (ctx.getOption('duration', 'integer') as number) || 60;

    let voiceChannel = channelOption;

    if (!voiceChannel) {
      voiceChannel = ctx.voiceChannel;
      if (!voiceChannel) {
        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setDescription(
                '❌ Bạn phải ở trong kênh thoại hoặc chỉ định kênh cần theo dõi',
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

    try {
      const tracker = deps.meetingTracker;
      const members = Array.from(voiceChannel.members.values());

      tracker.createSession(
        voiceChannel.id,
        ctx.channelId!,
        ctx.member!,
        durationMinutes,
      );

      tracker.initializeCurrentParticipants(voiceChannel.id, members as any);

      tracker.setAutoEnd(voiceChannel.id, async () => {
        const endedSession = await tracker.endSession(voiceChannel.id);
        if (!endedSession) return;

        const textChannel = await ctx.client.channels.fetch(
          endedSession.textChannelId,
        );
        if (textChannel?.isTextBased()) {
          await sendBasicReport(textChannel as any, endedSession, tracker);
        }

        const initiator = await ctx.client.users.fetch(
          endedSession.initiatorId,
        );
        if (initiator) {
          await sendDetailedReport(
            initiator,
            endedSession,
            tracker,
            voiceChannel.name,
          );
        }
      });

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('📋 Bắt đầu theo dõi cuộc họp')
        .setDescription(`Đang theo dõi **${voiceChannel.name}**`)
        .addFields(
          {
            name: '⏱️ Thời gian',
            value: `${durationMinutes} phút`,
            inline: true,
          },
          {
            name: '👥 Người tham gia',
            value: members.filter((m: any) => !m.user.bot).length.toString(),
            inline: true,
          },
        )
        .setFooter({ text: 'Dùng /end_tracking để kết thúc sớm' })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });
    } catch (error: any) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(error.message || '❌ Không thể bắt đầu theo dõi'),
        ],
      });
    }
  },
};

async function sendBasicReport(
  channel: any,
  session: MeetingSession,
  tracker: MeetingTracker,
) {
  const participants = Array.from(session.participants.values()).sort(
    (a: MeetingParticipant, b: MeetingParticipant) =>
      b.totalDuration - a.totalDuration,
  );
  const totalParticipants = participants.length;
  const avgDuration =
    participants.length > 0
      ? participants.reduce(
          (sum: number, p: MeetingParticipant) => sum + p.totalDuration,
          0,
        ) / participants.length
      : 0;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('📊 Tóm tắt cuộc họp')
    .addFields(
      {
        name: '👥 Tổng người tham gia',
        value: totalParticipants.toString(),
        inline: true,
      },
      {
        name: '⏱️ Thời gian TB',
        value: tracker.formatDuration(avgDuration),
        inline: true,
      },
      {
        name: '🕐 Tổng thời gian',
        value: tracker.formatDuration(Date.now() - session.startTime),
        inline: true,
      },
    );

  if (totalParticipants > 0) {
    const display = participants.slice(0, 50);
    let list = '';
    for (let i = 0; i < display.length; i++) {
      list += `${i + 1}. **${display[i].displayName}** — ${tracker.formatDuration(display[i].totalDuration)}\n`;
    }
    if (totalParticipants > 50)
      list += `\n*...và ${totalParticipants - 50} người khác*`;
    embed.addFields({ name: 'Danh sách', value: list });
  }

  embed.setTimestamp();
  await channel.send({ embeds: [embed] });
}

async function sendDetailedReport(
  user: any,
  session: MeetingSession,
  tracker: MeetingTracker,
  channelName: string,
) {
  const participants = Array.from(session.participants.values()).sort(
    (a: MeetingParticipant, b: MeetingParticipant) =>
      b.totalDuration - a.totalDuration,
  );

  let report = `**📋 Báo cáo cuộc họp: ${channelName}**\n\n`;
  report += `Bắt đầu: <t:${Math.floor(session.startTime / 1000)}:F>\n`;
  report += `Kết thúc: <t:${Math.floor((session.endTime || Date.now()) / 1000)}:F>\n`;
  report += `Tổng người tham gia: ${participants.length}\n\n`;
  report += `**Chi tiết điểm danh:**\n\n`;

  for (const p of participants) {
    report += `**${p.displayName}** (@${p.tag})\n`;
    report += `• Tổng thời gian: ${tracker.formatDuration(p.totalDuration)}\n`;
    report += `• Số phiên: ${p.sessions.length}\n`;
    for (let i = 0; i < p.sessions.length; i++) {
      const s = p.sessions[i];
      const dur = s.leftAt ? s.leftAt - s.joinedAt : Date.now() - s.joinedAt;
      report += `  ${i + 1}. <t:${Math.floor(s.joinedAt / 1000)}:t> - <t:${Math.floor((s.leftAt || Date.now()) / 1000)}:t> (${tracker.formatDuration(dur)})\n`;
    }
    report += `\n`;
  }

  // Split into chunks if too long
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
    for (const chunk of chunks) await user.send(chunk);
  } else {
    await user.send(report);
  }
}

export default startTracking;
