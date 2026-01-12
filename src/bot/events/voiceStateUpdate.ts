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
  },
};
