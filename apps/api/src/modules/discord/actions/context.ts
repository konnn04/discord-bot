import type { Message } from 'discord.js';
import type { ContextAdapter } from '../contexts/context-adapter';
import type { ActionContext } from './types';
import type { DiscordDeps } from '../deps.types';

export function contextFromCommand(
  ctx: ContextAdapter,
  deps: DiscordDeps,
): ActionContext | null {
  const guild = ctx.guild;
  if (!guild) return null;
  return {
    guild,
    actor: ctx.member,
    voiceChannel: ctx.voiceChannel ?? null,
    textChannelId: ctx.channelId,
    client: guild.client,
    deps,
  };
}

/** Build a normalized {@link ActionContext} from a chatbot's Discord message. */
export function contextFromMessage(
  message: Message,
  deps: DiscordDeps,
): ActionContext | null {
  const guild = message.guild;
  if (!guild) return null;
  return {
    guild,
    actor: message.member,
    voiceChannel: message.member?.voice?.channel ?? null,
    textChannelId: message.channelId,
    client: message.client,
    deps,
  };
}
