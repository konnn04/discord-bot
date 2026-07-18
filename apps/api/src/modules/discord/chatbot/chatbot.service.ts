import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AttachmentBuilder, type Message } from 'discord.js';
import type { GuildSettings } from 'shared/src/types/settings.types';
import {
  llmChat,
  isProviderConfigured,
  type LlmMessage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type LlmProvider,
  type LlmTool,
} from './llm-client';
import { CHAT_TOOLS } from './tools';
import { buildReplyParts } from './message-splitter';

const DEFAULT_SYSTEM_PROMPT =
  'Bạn là FoxyBot, trợ lý thân thiện trong server Discord. Trả lời ngắn gọn, ' +
  'vui vẻ bằng ngôn ngữ của người dùng (mặc định tiếng Việt). Chỉ dùng công cụ ' +
  'khi cần và khi được cấp quyền.';

const MEMORY_LIMIT = 10;
const MAX_TOOL_ROUNDS = 4;

export class ChatbotService {
  private systemPrompt: string;
  private memory = new Map<string, LlmMessage[]>();

  constructor() {
    this.systemPrompt = this.loadSystemPrompt();
  }

  private loadSystemPrompt(): string {
    const dir = process.env.CHATBOT_PROMPTS_DIR || join(__dirname, 'prompts');
    try {
      const files = readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .sort();
      const parts = files.map((f) => readFileSync(join(dir, f), 'utf8'));
      const joined = parts.join('\n\n').trim();
      return joined || DEFAULT_SYSTEM_PROMPT;
    } catch {
      return DEFAULT_SYSTEM_PROMPT;
    }
  }

  async handleMention(message: Message, deps: any): Promise<void> {
    if (!message.guildId) return;
    const settings = deps?.guildSettings?.get(message.guildId) as
      | GuildSettings
      | undefined;
    const chatbot = settings?.chatbot;
    if (!chatbot?.enabled) return;

    const provider = chatbot.provider ?? 'gemini';
    if (!isProviderConfigured(provider)) {
      await message
        .reply('⚠️ Chatbot chưa được cấu hình API key trên server.')
        .catch(() => {});
      return;
    }

    const userText = this.stripMention(message).slice(0, 1500);
    if (!userText) return;

    const allowed = new Set(chatbot.allowedTools ?? []);
    const tools: LlmTool[] = Object.entries(CHAT_TOOLS)
      .filter(([id]) => allowed.has(id))
      .map(([, t]) => t.meta);

    const channelMem = this.memory.get(message.channelId) ?? [];
    const voiceState = message.member?.voice?.channel;
    const userContext = [
      `Người dùng hiện tại: ${message.author.username}`,
      voiceState
        ? `Đang trong kênh thoại: #${voiceState.name}`
        : 'KHÔNG ở trong kênh thoại nào.',
    ].join('\n');
    const systemWithContext =
      `${this.systemPrompt}\n\n## Trạng thái hiện tại\n${userContext}` +
      this.buildToolSection(tools);
    const messages: LlmMessage[] = [
      { role: 'system', content: systemWithContext },
      ...channelMem,
      { role: 'user', content: userText },
    ];

    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping().catch(() => {});
    }

    let finalText: string | null = null;
    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const result = await llmChat(provider, messages, tools);

        if (!result.toolCalls.length) {
          finalText = result.text;
          break;
        }

        messages.push({
          role: 'assistant',
          content: result.text ?? '',
          toolCalls: result.toolCalls,
        });

        for (const call of result.toolCalls) {
          const tool = CHAT_TOOLS[call.name];
          let output: string;
          if (!tool || !allowed.has(call.name)) {
            output = 'Công cụ này không được phép dùng.';
          } else {
            output = await Promise.resolve(
              tool.handler(call.args, { message, deps }),
            ).catch((e) => `Lỗi khi chạy công cụ: ${String(e)}`);
          }
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: output,
          });
        }
      }
    } catch (err) {
      await message.reply(`❌ Lỗi khi gọi AI: ${String(err)}`).catch(() => {});
      return;
    }

    if (!finalText) {
      finalText = 'Mình chưa có câu trả lời phù hợp.';
    }

    await this.sendReply(message, finalText);

    const mem = this.memory.get(message.channelId) ?? [];
    mem.push({ role: 'user', content: userText });
    mem.push({ role: 'assistant', content: finalText });
    while (mem.length > MEMORY_LIMIT) mem.shift();
    this.memory.set(message.channelId, mem);
  }

  private async sendReply(message: Message, reply: string): Promise<void> {
    const parts = buildReplyParts(reply);
    let first = true;
    for (const part of parts) {
      try {
        if (part.kind === 'text') {
          if (first) await message.reply(part.content);
          else await (message.channel as any).send(part.content);
        } else {
          const file = new AttachmentBuilder(
            Buffer.from(part.content, 'utf8'),
            {
              name: part.filename,
            },
          );
          await (message.channel as any).send({ files: [file] });
        }
        first = false;
      } catch {
        //
      }
    }
  }

  /**
   * Dynamic prompt section listing only the tools enabled for this guild, so the
   * model is told exactly what it may use. The hard gate stays elsewhere: only
   * these tools are sent to the LLM and executed.
   */
  private buildToolSection(tools: LlmTool[]): string {
    if (tools.length === 0) {
      return (
        '\n\n## Công cụ được cấp quyền\n' +
        'Hiện bạn KHÔNG được cấp công cụ nào. Trả lời bằng kiến thức của bạn và ' +
        'đừng nhắc tới việc dùng công cụ.'
      );
    }
    const lines = tools.map((t) => `- \`${t.name}\`: ${t.description}`);
    return `\n\n## Công cụ được cấp quyền\n${lines.join('\n')}`;
  }

  private stripMention(message: Message): string {
    const botId = message.client.user?.id;
    return message.content
      .replace(new RegExp(`<@!?${botId}>`, 'g'), '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

let _instance: ChatbotService | null = null;
export function getChatbotService(): ChatbotService {
  if (!_instance) _instance = new ChatbotService();
  return _instance;
}
