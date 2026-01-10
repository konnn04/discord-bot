import { VoiceState } from 'discord.js';
import { BotClient } from '../types/bot.types';

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
  },
};
