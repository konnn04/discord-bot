import type { EventHandler } from 'shared/src/types/discord.types';
import { DMChannel, GuildChannel } from 'discord.js';
import { getPlayerManager } from '../services/music/player-manager';

const channelDeleteEvent: EventHandler = {
  name: 'channelDelete',

  async execute(channel: DMChannel | GuildChannel, deps?: any) {
    if (channel.isDMBased()) return;

    // ====== Meeting Tracker Cleanup ======
    const meetingTracker = deps?.meetingTracker;
    if (meetingTracker) {
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
    }

    // ====== Music Player Cleanup ======
    if (channel.isVoiceBased()) {
      const pm = getPlayerManager();
      const guildId = channel.guild.id;
      if (pm.isConnected(guildId)) {
        pm.leave(guildId);
        console.log(
          `[Music] Voice channel ${channel.id} deleted, cleaned up music player for guild ${guildId}.`,
        );
      }
    }
  },
};

export default channelDeleteEvent;
