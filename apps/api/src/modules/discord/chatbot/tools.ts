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
  getChatHistoryAction,
  searchMemoryAction,
  getVoiceMembersAction,
  moveVoiceMembersAction,
  changeNicknameAction,
  getUserActivityAction,
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
  getChatHistoryToolSchema,
  searchMemoryToolSchema,
  getVoiceMembersToolSchema,
  moveVoiceMembersToolSchema,
  changeNicknameToolSchema,
  getUserActivityToolSchema,
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

  get_chat_history: guildTool(
    getChatHistoryToolSchema,
    getChatHistoryAction,
    (a) => ({
      limit: a.limit != null ? Number(a.limit) : undefined,
      channel_id: a.channel_id != null ? str(a.channel_id) : undefined,
    }),
  ),

  search_memory: guildTool(
    searchMemoryToolSchema,
    searchMemoryAction,
    (a) => ({ query: str(a.query) }),
  ),

  get_voice_members: guildTool(
    getVoiceMembersToolSchema,
    getVoiceMembersAction,
    (a) => ({
      channel_id: a.channel_id != null ? str(a.channel_id) : undefined,
    }),
  ),

  move_voice_members: guildTool(
    moveVoiceMembersToolSchema,
    moveVoiceMembersAction,
    (a) => ({
      target_channel_id: str(a.target_channel_id),
      member_ids: a.member_ids != null ? str(a.member_ids) : undefined,
    }),
  ),

  change_nickname: guildTool(
    changeNicknameToolSchema,
    changeNicknameAction,
    (a) => ({
      user_id: str(a.user_id),
      nickname: a.nickname != null ? str(a.nickname) : undefined,
    }),
  ),

  get_user_activity: guildTool(
    getUserActivityToolSchema,
    getUserActivityAction,
    (a) => ({ user_id: str(a.user_id) }),
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
