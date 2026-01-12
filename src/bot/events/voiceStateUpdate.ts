import { VoiceState } from 'discord.js';
import { BotClient } from '../types/bot.types';
import { LevelingService } from '@services/LevelingService';
import { db } from '@src/database/client';
import { userGuildStats } from '@src/database/schema';
import { eq, and } from 'drizzle-orm';

export default {
  name: 'voiceStateUpdate',
  async execute(oldState: VoiceState, newState: VoiceState) {
    const client = newState.client as BotClient;
    const member = newState.member;

    if (!member || member.user.bot) return;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    if (!oldChannelId && newChannelId) {
      const session = client.meetingTracker.getSession(newChannelId);
      if (session) {
        client.meetingTracker.addParticipant(newChannelId, member);
      }
    }
    
    else if (oldChannelId && !newChannelId) {
      const session = client.meetingTracker.getSession(oldChannelId);
      if (session) {
        client.meetingTracker.removeParticipant(oldChannelId, member.id);
      }
    }
    
    else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
      const oldSession = client.meetingTracker.getSession(oldChannelId);
      if (oldSession) {
        client.meetingTracker.removeParticipant(oldChannelId, member.id);
      }
      
      const newSession = client.meetingTracker.getSession(newChannelId);
      if (newSession) {
        client.meetingTracker.addParticipant(newChannelId, member);
      }
    }
    // Voice XP Tracking
    try {
        // User Joined (Old: None, New: Channel)
        if (!oldChannelId && newChannelId) {
             await LevelingService.startVoiceSession(newState.guild.id, member.id);
        }
        
        // User Left (Old: Channel, New: None)
        else if (oldChannelId && !newChannelId) {
            await LevelingService.endVoiceSession(oldState.guild.id, member.id);
        }
        
        // User Switched (Old: Channel A, New: Channel B)
        else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
             await LevelingService.switchVoiceSession(newState.guild.id, member.id);
        }
    } catch (err) {
        console.error('[Leveling] Voice XP error:', err);
    }

    // --- Voice Logging & Music Idle ---
    try {
        const guildId = newState.guild.id;
        const { I18nService } = await import('@services/I18nService');
        const { GuildSettingsService } = await import('@services/GuildSettingsService');
        const { MusicService } = await import('@services/MusicService');
        const { EmbedBuilder } = await import('discord.js');

        const settings = await GuildSettingsService.get(guildId);
        
        // Music Idle Handling
        const queue = MusicService.getQueue(guildId);
        if (queue && queue.connection && queue.connection.joinConfig.channelId) {
             const botChannelId = queue.connection.joinConfig.channelId;
             if (oldChannelId === botChannelId || newChannelId === botChannelId) {
                 const channel = newState.guild.channels.cache.get(botChannelId);
                 if (channel && channel.isVoiceBased()) {
                     const nonBots = channel.members.filter(m => !m.user.bot);
                     if (nonBots.size === 0) {
                         await MusicService.startIdleTimer(guildId);
                         
                         const timeout = settings?.musicIdleTimeout || 180;
                         const timeStr = timeout >= 60 ? `${Math.floor(timeout/60)}m` : `${timeout}s`;
                         
                         const msg = await I18nService.t(guildId, 'voice.aloneDesc', { time: timeStr });
                         const embed = new EmbedBuilder()
                            .setColor('Orange')
                            .setTitle(await I18nService.t(guildId, 'voice.aloneTitle'))
                            .setDescription(msg)
                            .setTimestamp();
                         
                         queue.textChannel?.send({ embeds: [embed] }).catch(() => {});

                     } else {
                         MusicService.cancelIdleTimer(guildId);
                     }
                 }
             }
        }

        // Voice Logging
        if (settings?.voiceLogEnabled) {
             // Joined
             if (!oldChannelId && newChannelId && newState.channel) {
                 const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(await I18nService.t(guildId, 'voice.joined', { user: `<@${member.id}>`, channel: newState.channel.id }));
                 
                 // Send to the voice channel's text chat
                 if (newState.channel.isTextBased()) {
                      (newState.channel as any).send({ embeds: [embed] }).catch(() => {});
                 }
             }
             // Left
             else if (oldChannelId && !newChannelId && oldState.channel) {
                 const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription(await I18nService.t(guildId, 'voice.left', { user: `<@${member.id}>`, channel: oldState.channel.id }));
                 
                 if (oldState.channel.isTextBased()) {
                      (oldState.channel as any).send({ embeds: [embed] }).catch(() => {});
                 }
             }
             // Moved
             else if (oldChannelId && newChannelId && oldChannelId !== newChannelId && oldState.channel && newState.channel) {
                 const embedOld = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription(await I18nService.t(guildId, 'voice.movedLeft', { user: `<@${member.id}>`, channel: oldState.channel.id }));
                 
                 const embedNew = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(await I18nService.t(guildId, 'voice.movedJoined', { user: `<@${member.id}>`, channel: newState.channel.id }));

                 if (oldState.channel.isTextBased()) (oldState.channel as any).send({ embeds: [embedOld] }).catch(() => {});
                 if (newState.channel.isTextBased()) (newState.channel as any).send({ embeds: [embedNew] }).catch(() => {});
             }
        }
    } catch (e) {
        console.error('[Voice] Error:', e);
    }
  },
};
