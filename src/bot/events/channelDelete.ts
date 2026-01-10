import { Channel, ChannelType } from 'discord.js';
import { BotClient } from '../types/bot.types';

export default {
  name: 'channelDelete',
  async execute(channel: Channel) {
    if (channel.type !== ChannelType.GuildVoice) return;

    const client = channel.client as BotClient;
    const tracker = client.meetingTracker;
    
    const session = tracker.getSession(channel.id);
    if (session) {
      await tracker.endSession(channel.id);
    }
  },
};
