import { ActionCommand } from '@shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { EmbedBuilder, ChannelType } from 'discord.js';
import { BotClient } from '@bot/types/bot.types';
import { MeetingTracker, MeetingSession, MeetingParticipant } from '@bot/utils/MeetingTracker';

const StartTrackingCommand: ActionCommand = {
  name: 'start_tracking',
  description: 'Start tracking voice channel meeting attendance',
  helpDescription: 'Begin tracking participants in a voice channel. Records join/leave times and generates reports when tracking ends.',
  optionalArgs: [
    {
      name: 'channel',
      description: 'Voice channel to track (defaults to your current channel)',
      type: 'CHANNEL',
      channelTypes: [2],
      required: false
    },
    {
      name: 'duration',
      description: 'Tracking duration in minutes (default: 60)',
      type: 'INTEGER',
      minValue: 1,
      maxValue: 1440,
      required: false
    }
  ],
  async execute(ctx: ContextAdapter) {
    const client = ctx.client as BotClient;

    if (!ctx.guild) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('This command can only be used in a server')
        ]
      });
      return;
    }

    const channelOption = ctx.getOption('channel', 'channel') as any;
    const durationMinutes = (ctx.getOption('duration', 'integer') as number) || 60;

    let voiceChannel = channelOption;
    
    if (!voiceChannel) {
      voiceChannel = ctx.voiceChannel;
      
      if (!voiceChannel) {
        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('You must be in a voice channel or specify a channel to track')
          ]
        });
        return;
      }
    }

    if (voiceChannel.type !== ChannelType.GuildVoice) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('The specified channel is not a voice channel')
        ]
      });
      return;
    }

    try {
      const tracker = client.meetingTracker;
      const members = Array.from(voiceChannel.members.values());

      const session = tracker.createSession(
        voiceChannel.id,
        ctx.channelId!,
        ctx.member!,
        durationMinutes
      );

      tracker.initializeCurrentParticipants(voiceChannel.id, members as any);

      tracker.setAutoEnd(voiceChannel.id, async () => {
        const endedSession = await tracker.endSession(voiceChannel.id);
        if (!endedSession) return;

        const textChannel = await client.channels.fetch(endedSession.textChannelId);
        if (textChannel?.isTextBased()) {
          await sendBasicReport(textChannel as any, endedSession, tracker);
        }

        const initiator = await client.users.fetch(endedSession.initiatorId);
        if (initiator) {
          await sendDetailedReport(initiator, endedSession, tracker, voiceChannel.name);
        }
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Meeting Tracking Started')
        .setDescription(`Tracking started for **${voiceChannel.name}**`)
        .addFields(
          { name: 'Duration', value: `${durationMinutes} minutes`, inline: true },
          { name: 'Current Participants', value: members.filter((m: any) => !m.user.bot).length.toString(), inline: true }
        )
        .setFooter({ text: `Use /end_tracking to stop tracking early` })
        .setTimestamp();

      await ctx.reply({ embeds: [embed] });

    } catch (error: any) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(error.message || 'Failed to start tracking')
        ]
      });
    }
  }
};

async function sendBasicReport(channel: any, session: MeetingSession, tracker: MeetingTracker) {
  const participants = Array.from(session.participants.values())
    .sort((a: MeetingParticipant, b: MeetingParticipant) => b.totalDuration - a.totalDuration);
  const totalParticipants = participants.length;
  const avgDuration = participants.length > 0
    ? participants.reduce((sum: number, p: MeetingParticipant) => sum + p.totalDuration, 0) / participants.length
    : 0;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('Meeting Summary')
    .addFields(
      { name: 'Total Participants', value: totalParticipants.toString(), inline: true },
      { name: 'Average Duration', value: tracker.formatDuration(avgDuration), inline: true },
      { name: 'Meeting Duration', value: tracker.formatDuration(Date.now() - session.startTime), inline: true }
    );

  if (totalParticipants > 0) {
    const displayParticipants = participants.slice(0, 50);
    let participantList = '';
    
    for (let i = 0; i < displayParticipants.length; i++) {
      const p = displayParticipants[i];
      participantList += `${i + 1}. **${p.displayName}** - ${tracker.formatDuration(p.totalDuration)}\n`;
    }
    
    if (totalParticipants > 50) {
      participantList += `\n*...and ${totalParticipants - 50} more*`;
    }

    embed.addFields({ name: 'Participants', value: participantList });
  }

  embed.setTimestamp();
  await channel.send({ embeds: [embed] });
}

async function sendDetailedReport(user: any, session: MeetingSession, tracker: MeetingTracker, channelName: string) {
  const participants = Array.from(session.participants.values())
    .sort((a: MeetingParticipant, b: MeetingParticipant) => b.totalDuration - a.totalDuration);

  let report = `**Meeting Report: ${channelName}**\n\n`;
  report += `Started: <t:${Math.floor(session.startTime / 1000)}:F>\n`;
  report += `Ended: <t:${Math.floor((session.endTime || Date.now()) / 1000)}:F>\n`;
  report += `Total Participants: ${participants.length}\n\n`;
  report += `**Detailed Attendance:**\n\n`;

  for (const participant of participants) {
    const joinCount = participant.sessions.length;
    report += `**${participant.displayName}** (@${participant.tag})\n`;
    report += `• Total Time: ${tracker.formatDuration(participant.totalDuration)}\n`;
    report += `• Sessions: ${joinCount}\n`;
    
    for (let i = 0; i < participant.sessions.length; i++) {
      const s = participant.sessions[i];
      const duration = s.leftAt ? s.leftAt - s.joinedAt : Date.now() - s.joinedAt;
      report += `  ${i + 1}. <t:${Math.floor(s.joinedAt / 1000)}:t> - <t:${Math.floor((s.leftAt || Date.now()) / 1000)}:t> (${tracker.formatDuration(duration)})\n`;
    }
    report += `\n`;
  }

  if (report.length > 2000) {
    const chunks = [];
    let current = '';
    const lines = report.split('\n');
    
    for (const line of lines) {
      if (current.length + line.length + 1 > 1900) {
        chunks.push(current);
        current = line + '\n';
      } else {
        current += line + '\n';
      }
    }
    if (current) chunks.push(current);

    for (const chunk of chunks) {
      await user.send(chunk);
    }
  } else {
    await user.send(report);
  }
}

export default StartTrackingCommand;
