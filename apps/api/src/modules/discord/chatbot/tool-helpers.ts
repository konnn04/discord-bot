import type { Message } from 'discord.js';
import type { LlmTool } from './llm-client';
import {
  contextFromMessage,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
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

type ActionFn<A> = (
  ctx: ActionContext,
  args: A,
) => ActionResult | Promise<ActionResult>;

export function guildTool<A>(
  meta: ToolSchema,
  action: ActionFn<A>,
  mapArgs: (raw: Record<string, unknown>) => A,
): ChatTool {
  return {
    meta,
    async handler(raw, ctx) {
      const actionCtx = contextFromMessage(ctx.message, ctx.deps);
      if (!actionCtx) return 'Không ở trong server.';
      const result = await action(actionCtx, mapArgs(raw));
      return result.message;
    },
  };
}

export function plainTool<A>(
  meta: ToolSchema,
  action: (args: A) => ActionResult | Promise<ActionResult>,
  mapArgs: (raw: Record<string, unknown>) => A,
): ChatTool {
  return {
    meta,
    async handler(raw) {
      const result = await action(mapArgs(raw));
      return result.message;
    },
  };
}
