import type { EventHandler } from 'shared/src/types/discord.types';
import { VoiceState, EmbedBuilder } from 'discord.js';
import { getPlayerManager } from '../services/music/player-manager';
import { isStalkRateLimited } from '../services/stalk-rate-limit';
import { ColorResolvable } from 'discord.js';

const voiceStateUpdateEvent: EventHandler = {
  name: 'voiceStateUpdate',

  execute(oldState: VoiceState, newState: VoiceState, deps: any) {
    const meetingTracker = deps?.meetingTracker;
    const voiceTagService = deps?.voiceTagService;
    const member = newState.member || oldState.member;
    if (!member) return;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // Voice tag role assignment (buffered, non-blocking)
    if (voiceTagService && !member.user.bot) {
      if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
        voiceTagService
          .onMemberLeave(newState.guild, member, oldChannelId)
          .catch(() => {});
        voiceTagService
          .onMemberJoin(newState.guild, member, newChannelId)
          .catch(() => {});
      } else if (newChannelId && !oldChannelId) {
        voiceTagService
          .onMemberJoin(newState.guild, member, newChannelId)
          .catch(() => {});
      } else if (oldChannelId && !newChannelId) {
        voiceTagService
          .onMemberLeave(newState.guild, member, oldChannelId)
          .catch(() => {});
      }
    }

    // Stalker: notify subscribers when target joins voice (cross-guild)
    if (deps?.prisma && !member.user.bot && newChannelId && !oldChannelId) {
      const voiceCh = newState.channel;
      const chName = voiceCh?.name || 'unknown';
      const eventGuildId = newState.guild.id;
      const eventGuildName = newState.guild.name;
      const client = newState.client;

      deps.prisma.client.stalkerSubscription
        .findMany({ where: { targetId: member.id, onVoice: true } })
        .then((subs: any[]) => {
          for (const sub of subs) {
            if (isStalkRateLimited(sub.id, 'voice')) continue;
            client.users
              .fetch(sub.trackerId)
              .then((u: any) => {
                const same = client.guilds.cache
                  .get(eventGuildId)
                  ?.members.cache.has(sub.trackerId);
                const guildLabel = same
                  ? `**${eventGuildName}**`
                  : '**server khác**';
                u.send(
                  `🔊 **Stalker Alert:** <@${member.id}> vừa vào kênh voice **#${chName}** tại ${guildLabel}!`,
                ).catch(() => {});
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    // Meeting Tracker Logic
    if (meetingTracker && !member.user.bot) {
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
    }

    // ====== Music Player Cleanup Logic ======
    const pm = getPlayerManager();
    const guild = newState.guild;
    const guildId = guild.id;
    const botId = guild.client.user?.id;

    if (botId) {
      // Bot was disconnected/kicked from voice
      if (member.id === botId && oldChannelId && !newChannelId) {
        if (pm.isConnected(guildId)) {
          pm.leave(guildId);
          console.log(
            `[Music] Bot was kicked from voice in guild ${guildId}, cleaned up.`,
          );
        }
      }

      // Check if bot is now alone in the voice channel
      if (!member.user.bot && oldChannelId && oldChannelId !== newChannelId) {
        const botVoiceState = guild.voiceStates.cache.get(botId);
        if (botVoiceState?.channelId === oldChannelId) {
          // Someone left the channel the bot is in
          const channel = oldState.channel;
          if (channel) {
            const nonBotMembers = channel.members.filter((m) => !m.user.bot);
            if (nonBotMembers.size === 0) {
              // Bot is alone, start auto-leave
              pm.handleAloneInChannel(guildId);
              console.log(
                `[Music] Bot is alone in voice channel ${oldChannelId}, starting auto-leave timer.`,
              );
            }
          }
        }
      }

      // Someone joined back to the bot's channel — cancel auto-leave
      if (!member.user.bot && newChannelId && newChannelId !== oldChannelId) {
        const botVoiceState = guild.voiceStates.cache.get(botId);
        if (botVoiceState?.channelId === newChannelId) {
          pm.cancelAutoLeave(guildId);
        }
      }
    }

    // --- Voice Welcome/Alert Feature ---
    if (!member.user.bot && deps?.guildSettings && newState.guild) {
      const settings = deps.guildSettings.get(newState.guild.id);
      if (settings?.features?.voiceWelcome) {
        const sendToChannel = (
          channel: any,
          desc: string,
          color: ColorResolvable = '#2ecc71',
        ) => {
          if (channel?.isTextBased()) {
            const embed = new EmbedBuilder()
              .setDescription(desc)
              .setColor(color);
            channel.send({ embeds: [embed] }).catch(() => {});
          }
        };

        // Joined a voice channel
        if (newChannelId && !oldChannelId) {
          sendToChannel(
            newState.channel,
            `👋 **<@${member.id}>** vừa tham gia kênh.`,
            '#2ecc71',
          );
        }
        // Left a voice channel
        else if (oldChannelId && !newChannelId) {
          sendToChannel(
            oldState.channel,
            `🚪 **<@${member.id}>** vừa rời kênh.`,
            '#e74c3c',
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
            `**<@${member.id}>** vừa vào kênh <#${newChannelId}>.`,
            '#f39c12',
          );
          sendToChannel(
            oldState.channel,
            `**<@${member.id}>** chuyển sang kênh khác rồi.`,
            '#f39c12',
          );
        }
      }
    }
  },
};

export default voiceStateUpdateEvent;
