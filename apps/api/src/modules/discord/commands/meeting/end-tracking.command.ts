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

    // Persist a full report and expose it via a shareable web link, instead of
    // dumping a long, chunked DM. Falls back gracefully if the DB is unavailable.
    let reportUrl: string | null = null;
    try {
      const prisma = deps?.prisma;
      if (prisma?.isConnected) {
        const reportParticipants = participants.map((pt: any) => ({
          userId: pt.userId,
          displayName: pt.displayName,
          tag: pt.tag,
          totalDuration: pt.totalDuration,
          sessions: pt.sessions.map((s: any) => ({
            joinedAt: s.joinedAt,
            leftAt: s.leftAt,
          })),
        }));

        const created = await prisma.client.meetingReport.create({
          data: {
            guildId: endedSession.guildId,
            voiceChannelId: voiceChannel.id,
            channelName: voiceChannel.name,
            initiatorId: endedSession.initiatorId,
            startTime: new Date(endedSession.startTime),
            endTime: new Date(endedSession.endTime || Date.now()),
            participants: reportParticipants,
          },
          select: { id: true },
        });

        reportUrl = `${getPublicBaseUrl()}/meetings/${created.id}`;
      }
    } catch {
      // Persisting is best-effort; the embed summary is still sent below.
    }

    if (reportUrl) {
      embed.addFields({
        name: '🔗 Báo cáo chi tiết',
        value: `[Xem báo cáo đầy đủ trên web](${reportUrl})`,
      });
    }

    await ctx.reply({ embeds: [embed] });
  },
};

/** Public base URL used to build shareable links (mirrors auth controller logic). */
function getPublicBaseUrl(): string {
  const envDomain =
    process.env.CUSTOM_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (envDomain) {
    return envDomain.startsWith('http') ? envDomain : `https://${envDomain}`;
  }
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

export default endTracking;
