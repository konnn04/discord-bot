import type { EventHandler } from 'shared/src/types/discord.types';
import { DMChannel, GuildChannel } from 'discord.js';

const channelDeleteEvent: EventHandler = {
  name: 'channelDelete',

  async execute(channel: DMChannel | GuildChannel, deps?: any) {
    if (channel.isDMBased()) return;

    const meetingTracker = deps?.meetingTracker;
    if (!meetingTracker) return;

    const session = meetingTracker.getSession(channel.id);
    if (session) {
      if (session.onEndCallback) {
        await session.onEndCallback();
      } else {
        await meetingTracker.endSession(channel.id);
      }
      console.log(
        `[INFO] Meeting session ended due to channel deletion: ${channel.id}`,
      );
    }
  },
};

export default channelDeleteEvent;
