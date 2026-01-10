import { ActionCommand } from '@shared/types/bot.types';
import { ContextAdapter } from '@bot/contexts/ContextAdapter';
import { EmbedBuilder, ChannelType } from 'discord.js';
import { BotClient } from '@bot/types/bot.types';
import { MeetingTracker, MeetingSession, MeetingParticipant } from '@bot/utils/MeetingTracker';

const EndTrackingCommand: ActionCommand = {
  name: 'end_tracking',
  description: 'End voice channel meeting tracking',
  helpDescription: 'Stop tracking a voice channel meeting and generate attendance reports.',
  optionalArgs: [
    {
      name: 'channel',
      description: 'Voice channel to stop tracking (defaults to your current channel)',
      type: 'CHANNEL',
      channelTypes: [2],
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
    let voiceChannel = channelOption;
    
    if (!voiceChannel) {
      voiceChannel = ctx.voiceChannel;
      
      if (!voiceChannel) {
        await ctx.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('You must be in a voice channel or specify a channel')
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

    const tracker = client.meetingTracker;
    const session = tracker.getSession(voiceChannel.id);

    if (!session) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('No active tracking session found for this voice channel')
        ]
      });
      return;
    }

    const endedSession = await tracker.endSession(voiceChannel.id);
    if (!endedSession) {
      await ctx.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('Failed to end tracking session')
        ]
      });
      return;
    }

    const participants = Array.from(endedSession.participants.values())
      .sort((a: MeetingParticipant, b: MeetingParticipant) => b.totalDuration - a.totalDuration);
    const totalParticipants = participants.length;
    const avgDuration = participants.length > 0
      ? participants.reduce((sum: number, p: MeetingParticipant) => sum + p.totalDuration, 0) / participants.length
      : 0;

    const basicEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Meeting Summary')
      .setDescription(`**${voiceChannel.name}**`)
      .addFields(
        { name: 'Total Participants', value: totalParticipants.toString(), inline: true },
        { name: 'Average Duration', value: tracker.formatDuration(avgDuration), inline: true },
        { name: 'Meeting Duration', value: tracker.formatDuration(Date.now() - endedSession.startTime), inline: true }
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

      basicEmbed.addFields({ name: 'Participants', value: participantList });
    }

    basicEmbed.setTimestamp();

    await ctx.reply({ embeds: [basicEmbed] });

    try {
      const sortedParticipants = participants;

      let report = `**Meeting Report: ${voiceChannel.name}**\n\n`;
      report += `Started: <t:${Math.floor(endedSession.startTime / 1000)}:F>\n`;
      report += `Ended: <t:${Math.floor((endedSession.endTime || Date.now()) / 1000)}:F>\n`;
      report += `Total Participants: ${sortedParticipants.length}\n\n`;
      report += `**Detailed Attendance:**\n\n`;

      for (const participant of sortedParticipants) {
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
          await ctx.user.send(chunk);
        }
      } else {
        await ctx.user.send(report);
      }

      await ctx.user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription('Detailed report sent successfully')
        ]
      });

    } catch (error) {
      console.error('Failed to send detailed report:', error);
    }
  }
};

export default EndTrackingCommand;
