import type { Client, Guild, GuildMember, VoiceBasedChannel } from 'discord.js';
import type { DiscordDeps } from '../deps.types';

/**
 * Normalized context an action runs in — independent of how it was triggered
 * (slash command, prefix command, chatbot tool, cron). The presentation layer
 * builds this and formats the {@link ActionResult}.
 */
export interface ActionContext {
  guild: Guild;
  /** The member who triggered the action (null for system/cron callers). */
  actor: GuildMember | null;
  /** The actor's current voice channel, when relevant. */
  voiceChannel?: VoiceBasedChannel | null;
  /** The text channel the action was triggered from, when relevant. */
  textChannelId?: string | null;
  client: Client;
  /** Injected services (prisma, guildSettings, ...). */
  deps: DiscordDeps;
}

/**
 * Structured action outcome. `message` is a plain human summary the chatbot can
 * send directly; `data` carries structured detail a command can render richly.
 */
export interface ActionResult<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
}

/** An action: normalized context + typed args → structured result. */
export type Action<Args, Data = unknown> = (
  ctx: ActionContext,
  args: Args,
) => Promise<ActionResult<Data>>;

/**
 * Chatbot tool descriptor, co-located with its action so the JSON schema and
 * the action's args can't drift into different files.
 */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function ok<T>(message: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function fail(message: string): ActionResult<never> {
  return { ok: false, message };
}
