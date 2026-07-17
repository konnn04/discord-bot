import type { Message } from 'discord.js';
import type { LlmTool } from './llm-client';
import {
  contextFromMessage,
  getGiftcodeAction,
  guildInfoAction,
  listMembersAction,
  memberInfoAction,
  playMusicAction,
  renameVoiceChannelAction,
  setVoiceBitrateAction,
  giftcodeToolSchema,
  guildInfoToolSchema,
  listMembersToolSchema,
  memberInfoToolSchema,
  playMusicToolSchema,
  renameVoiceChannelToolSchema,
  setVoiceBitrateToolSchema,
} from '../actions';

export interface ChatToolContext {
  message: Message;
  deps: any;
}

export interface ChatTool {
  meta: LlmTool;
  handler: (
    args: Record<string, unknown>,
    ctx: ChatToolContext,
  ) => string | Promise<string>;
}

export const CHAT_TOOLS: Record<string, ChatTool> = {
  get_giftcode: {
    meta: giftcodeToolSchema,
    async handler(args) {
      const game = typeof args.game === 'string' ? args.game : '';
      const r = await getGiftcodeAction({ game });
      return r.message;
    },
  },

  guild_info: {
    meta: guildInfoToolSchema,
    handler(_args, ctx) {
      const actionCtx = contextFromMessage(ctx.message, ctx.deps);
      if (!actionCtx) return 'Không ở trong server.';
      return guildInfoAction(actionCtx).message;
    },
  },

  list_members: {
    meta: listMembersToolSchema,
    handler(args, ctx) {
      const actionCtx = contextFromMessage(ctx.message, ctx.deps);
      if (!actionCtx) return 'Không ở trong server.';
      return listMembersAction(actionCtx, { limit: Number(args.limit) })
        .message;
    },
  },

  member_info: {
    meta: memberInfoToolSchema,
    handler(args, ctx) {
      const actionCtx = contextFromMessage(ctx.message, ctx.deps);
      if (!actionCtx) return 'Không ở trong server.';
      const query = typeof args.query === 'string' ? args.query : '';
      return memberInfoAction(actionCtx, { query }).message;
    },
  },

  play_music: {
    meta: playMusicToolSchema,
    async handler(args, ctx) {
      const actionCtx = contextFromMessage(ctx.message, ctx.deps);
      if (!actionCtx) return 'Không ở trong server.';
      const query = typeof args.query === 'string' ? args.query : '';
      return (await playMusicAction(actionCtx, { query })).message;
    },
  },

  rename_voice_channel: {
    meta: renameVoiceChannelToolSchema,
    async handler(args, ctx) {
      const actionCtx = contextFromMessage(ctx.message, ctx.deps);
      if (!actionCtx) return 'Không ở trong server.';
      const name = typeof args.name === 'string' ? args.name : '';
      return (await renameVoiceChannelAction(actionCtx, { name })).message;
    },
  },

  set_voice_bitrate: {
    meta: setVoiceBitrateToolSchema,
    async handler(args, ctx) {
      const actionCtx = contextFromMessage(ctx.message, ctx.deps);
      if (!actionCtx) return 'Không ở trong server.';
      const region = typeof args.region === 'string' ? args.region : undefined;
      return (
        await setVoiceBitrateAction(actionCtx, {
          bitrate: args.bitrate != null ? Number(args.bitrate) : undefined,
          region,
        })
      ).message;
    },
  },
};
