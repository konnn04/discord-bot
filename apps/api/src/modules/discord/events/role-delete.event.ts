import type { EventHandler } from 'shared/src/types/discord.types';
import { Role } from 'discord.js';

const roleDeleteEvent: EventHandler = {
  name: 'roleDelete',

  async execute(role: Role, deps?: any) {
    const voiceTagService = deps?.voiceTagService;
    if (!voiceTagService || !role.guild) return;

    try {
      await voiceTagService.onRoleDelete(role.guild, role);
    } catch {
      // Non-fatal — don't crash the event loop
    }
  },
};

export default roleDeleteEvent;
