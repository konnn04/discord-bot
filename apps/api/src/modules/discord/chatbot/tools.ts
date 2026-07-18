import {
  getGiftcodeAction,
  crawlGiftcodeAction,
  guildInfoAction,
  listMembersAction,
  memberInfoAction,
  playMusicAction,
  renameVoiceChannelAction,
  setVoiceBitrateAction,
  skipMusicAction,
  pauseMusicAction,
  resumeMusicAction,
  stopMusicAction,
  nowPlayingAction,
  giftcodeToolSchema,
  crawlGiftcodeToolSchema,
  guildInfoToolSchema,
  listMembersToolSchema,
  memberInfoToolSchema,
  playMusicToolSchema,
  renameVoiceChannelToolSchema,
  setVoiceBitrateToolSchema,
  skipMusicToolSchema,
  pauseMusicToolSchema,
  resumeMusicToolSchema,
  stopMusicToolSchema,
  nowPlayingToolSchema,
} from '../actions';
import { guildTool, plainTool, type ChatTool } from './tool-helpers';

export type { ChatTool, ChatToolContext } from './tool-helpers';

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Tools the chatbot can use. Each is a thin adapter over a shared action in
 * ../actions, built with guildTool/plainTool so there's no repeated
 * context-building or null-checking boilerplate.
 */
export const CHAT_TOOLS: Record<string, ChatTool> = {
  get_giftcode: plainTool(giftcodeToolSchema, getGiftcodeAction, (a) => ({
    game: str(a.game),
  })),

  crawl_giftcode: guildTool(
    crawlGiftcodeToolSchema,
    crawlGiftcodeAction,
    (a) => ({ game: str(a.game) }),
  ),

  guild_info: guildTool(guildInfoToolSchema, guildInfoAction, () => undefined),

  list_members: guildTool(listMembersToolSchema, listMembersAction, (a) => ({
    limit: Number(a.limit),
  })),

  member_info: guildTool(memberInfoToolSchema, memberInfoAction, (a) => ({
    query: str(a.query),
  })),

  play_music: guildTool(playMusicToolSchema, playMusicAction, (a) => ({
    query: str(a.query),
  })),

  rename_voice_channel: guildTool(
    renameVoiceChannelToolSchema,
    renameVoiceChannelAction,
    (a) => ({ name: str(a.name) }),
  ),

  set_voice_bitrate: guildTool(
    setVoiceBitrateToolSchema,
    setVoiceBitrateAction,
    (a) => ({
      bitrate: a.bitrate != null ? Number(a.bitrate) : undefined,
      region: a.region != null ? String(a.region) : undefined,
    }),
  ),

  skip_music: guildTool(skipMusicToolSchema, skipMusicAction, (a) => ({
    count: a.count != null ? Number(a.count) : undefined,
  })),

  pause_music: guildTool(pauseMusicToolSchema, pauseMusicAction, () => undefined),

  resume_music: guildTool(
    resumeMusicToolSchema,
    resumeMusicAction,
    () => undefined,
  ),

  stop_music: guildTool(stopMusicToolSchema, stopMusicAction, () => undefined),

  now_playing: guildTool(nowPlayingToolSchema, nowPlayingAction, () => undefined),
};
