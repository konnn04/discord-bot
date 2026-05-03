import type { EventHandler } from 'shared/src/types/discord.types';
import { VoiceState, EmbedBuilder } from 'discord.js';

const voiceStateUpdateEvent: EventHandler = {
  name: 'voiceStateUpdate',

  execute(oldState: VoiceState, newState: VoiceState, deps: any) {
    const meetingTracker = deps?.meetingTracker;
    if (!meetingTracker) return;

    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // User left a tracked channel
    if (oldChannelId && oldChannelId !== newChannelId) {
      const session = meetingTracker.getSession(oldChannelId);
      if (session) {
        meetingTracker.removeParticipant(oldChannelId, member.id);
      }
    }

    // User joined a tracked channel
    if (newChannelId && newChannelId !== oldChannelId) {
      const session = meetingTracker.getSession(newChannelId);
      if (session) {
        meetingTracker.addParticipant(newChannelId, member);
      }
    }

    // --- Voice Welcome/Alert Feature ---
    if (deps?.guildSettings && newState.guild) {
      const settings = deps.guildSettings.get(newState.guild.id);
      if (settings?.features?.voiceWelcome) {
        const sendToChannel = (channel: any, desc: string) => {
          if (channel?.isTextBased()) {
            const embed = new EmbedBuilder()
              .setDescription(desc)
              .setColor('#2ecc71');
            channel.send({ embeds: [embed] }).catch(() => {});
          }
        };

        // Joined a voice channel
        if (newChannelId && !oldChannelId) {
          sendToChannel(
            newState.channel,
            `🎤 **${member.user.username}** vừa tham gia kênh.`,
          );
        }
        // Left a voice channel
        else if (oldChannelId && !newChannelId) {
          sendToChannel(
            oldState.channel,
            `👋 **${member.user.username}** vừa rời kênh.`,
          );
        }
        // Switched voice channels
        else if (
          newChannelId &&
          oldChannelId &&
          newChannelId !== oldChannelId
        ) {
          sendToChannel(
            newState.channel,
            `🔄 **${member.user.username}** vừa chuyển đến từ <#${oldChannelId}>.`,
          );
          sendToChannel(
            oldState.channel,
            `🔄 **${member.user.username}** vừa chuyển sang <#${newChannelId}>.`,
          );
        }
      }
    }
  },
};

export default voiceStateUpdateEvent;
