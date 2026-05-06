import type { EventHandler } from 'shared/src/types/discord.types';
import { DMChannel, GuildChannel } from 'discord.js';
import { getPlayerManager } from '../services/music/player-manager';

const channelDeleteEvent: EventHandler = {
  name: 'channelDelete',

  async execute(channel: DMChannel | GuildChannel, deps?: any) {
    if (channel.isDMBased()) return;

    // Meeting tracker cleanup
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

    // Voice tag role cleanup
    if (channel.isVoiceBased()) {
      deps?.voiceTagService
        ?.onChannelDelete(channel.guild, channel.id)
        .catch(() => {});
    }

    // Music player cleanup
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
