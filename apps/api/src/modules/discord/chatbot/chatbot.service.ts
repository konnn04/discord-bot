import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AttachmentBuilder, type Message } from 'discord.js';
import type { GuildSettings } from 'shared/src/types/settings.types';
import sharp from 'sharp';
import {
  llmChat,
  isProviderConfigured,
  type LlmMessage,
  type LlmImage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type LlmProvider,
  type LlmTool,
} from './llm-client';
import { CHAT_TOOLS } from './tools';
import { buildReplyParts } from './message-splitter';
import { getGuildMemoryService } from './memory.service';

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

  private async extractAndCompressImages(
    message: Message,
    readImages: boolean,
    compressImages: boolean,
  ): Promise<LlmImage[]> {
    if (!readImages) return [];

    const rawAttachments = [...message.attachments.values()].filter((att) => {
      const ct = att.contentType?.toLowerCase() || '';
      if (ct.startsWith('image/')) return true;
      const name = att.name?.toLowerCase() || '';
      return /\.(jpe?g|png|webp|gif)$/i.test(name);
    });

    if (rawAttachments.length === 0 && message.reference?.messageId) {
      try {
        const refMsg = await message.channel.messages.fetch(
          message.reference.messageId,
        );
        if (refMsg) {
          const refImages = [...refMsg.attachments.values()].filter((att) => {
            const ct = att.contentType?.toLowerCase() || '';
            return (
              ct.startsWith('image/') ||
              /\.(jpe?g|png|webp|gif)$/i.test(att.name || '')
            );
          });
          rawAttachments.push(...refImages);
        }
      } catch {
        // ignore
      }
    }

    const targets = rawAttachments.slice(0, 3);
    if (targets.length === 0) return [];

    const results: LlmImage[] = [];
    for (const att of targets) {
      try {
        const res = await fetch(att.url);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (compressImages) {
          try {
            const compressed = await sharp(buffer)
              .resize({
                width: 1280,
                height: 1280,
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({ quality: 80 })
              .toBuffer();

            results.push({
              mimeType: 'image/jpeg',
              base64: compressed.toString('base64'),
            });
            continue;
          } catch {
            // fallback
          }
        }

        const mimeType = att.contentType || 'image/jpeg';
        results.push({
          mimeType,
          base64: buffer.toString('base64'),
        });
      } catch {
        // ignore
      }
    }

    return results;
  }

  async handleMention(message: Message, deps: any): Promise<void> {
    if (!message.guildId) return;
    const settings = deps?.guildSettings?.get(message.guildId) as
      | GuildSettings
      | undefined;
    const chatbot = settings?.chatbot;
    if (!chatbot?.enabled) return;

    const provider = chatbot.provider ?? 'gemini';
    if (!isProviderConfigured(provider, chatbot.apiKey)) {
      await message
        .reply('⚠️ Chatbot chưa được cấu hình API key trên server.')
        .catch(() => {});
      return;
    }

    const readImages = chatbot.readImages ?? true;
    const compressImages = chatbot.compressImages ?? true;
    const images = await this.extractAndCompressImages(
      message,
      readImages,
      compressImages,
    );

    const rawUserText = this.stripMention(message).slice(0, 1500);
    const userText =
      rawUserText ||
      (images.length > 0
        ? 'Hãy quan sát, mô tả chi tiết và giải thích nội dung trong hình ảnh này giúp tôi.'
        : '');

    if (!userText && images.length === 0) return;

    const allowed = new Set(chatbot.allowedTools ?? []);
    const tools: LlmTool[] = Object.entries(CHAT_TOOLS)
      .filter(([id]) => allowed.has(id))
      .map(([, t]) => t.meta);

    const channelMem = this.memory.get(message.channelId) ?? [];
    const voiceState = message.member?.voice?.channel;
    const userContext = [
      `Người dùng hiện tại: ${message.author.username} (ID: ${message.author.id})`,
      voiceState
        ? `Đang trong kênh thoại: #${voiceState.name}`
        : 'KHÔNG ở trong kênh thoại nào.',
    ].join('\n');

    // Retrieve relevant guild-scoped memories
    const memoryService = getGuildMemoryService(deps?.prisma);
    const mentionedUserIds = [...message.mentions.users.keys()];
    const relevantMemories = await memoryService.findRelevantMemories(
      message.guildId,
      userText,
      [message.author.id, ...mentionedUserIds],
      8,
    );

    let memoryContext = '';
    if (relevantMemories.length > 0) {
      const lines = relevantMemories.map((m) => `- [${m.key}]: ${m.value}`);
      memoryContext = `\n\n## Ký ức đã lưu của server này (Guild Memories)\n${lines.join('\n')}`;
    }

    const formatInstruction =
      '\n\n## Định dạng phản hồi JSON\n' +
      'Bạn PHẢI luôn trả về kết quả bằng một đối tượng JSON hợp lệ duy nhất có cấu trúc:\n' +
      '{\n' +
      '  "answer": "Nội dung trả lời người dùng bằng tiếng Việt tự nhiên, thân thiện...",\n' +
      '  "remember": [\n' +
      '    { "key": "từ khoá hoặc ID/nickname (ví dụ: konnn, 732157441889927239)", "value": "thông tin cần nhớ về người/sự kiện này" }\n' +
      '  ],\n' +
      '  "sources": ["tên các công cụ hoặc ký ức đã tham khảo"]\n' +
      '}\n' +
      'Lưu ý: Nếu không có gì mới cần ghi nhớ, để "remember": []. Không đưa thêm văn bản ngoài khối JSON.';

    const systemWithContext =
      `${this.systemPrompt}\n\n## Trạng thái hiện tại\n${userContext}` +
      memoryContext +
      this.buildToolSection(tools) +
      formatInstruction;

    const userMessage: LlmMessage = {
      role: 'user',
      content: userText,
      images: images.length > 0 ? images : undefined,
    };

    const messages: LlmMessage[] = [
      { role: 'system', content: systemWithContext },
      ...channelMem,
      userMessage,
    ];

    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping().catch(() => {});
    }

    let finalText: string | null = null;
    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const result = await llmChat(provider, messages, tools, {
          model: chatbot.model,
          apiKey: chatbot.apiKey,
          baseUrl: chatbot.baseUrl,
        });

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

    const structured = parseLlmStructuredOutput(finalText);
    const replyAnswer = structured.answer || 'Mình chưa có câu trả lời phù hợp.';

    if (structured.remember && structured.remember.length > 0) {
      for (const item of structured.remember) {
        if (item.key && item.value) {
          void memoryService.remember(
            message.guildId,
            item.key,
            item.value,
            {
              source: 'ai',
              authorId: message.author.id,
              authorName: message.author.displayName || message.author.username,
              channelId: message.channelId,
            },
          );
        }
      }
    }

    await this.sendReply(message, replyAnswer);

    const mem = this.memory.get(message.channelId) ?? [];
    mem.push({ role: 'user', content: userText });
    mem.push({ role: 'assistant', content: replyAnswer });
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
        // ignore
      }
    }
  }

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

export interface StructuredChatbotResponse {
  answer: string;
  remember?: Array<{ key: string; value: string }>;
  sources?: string[];
}

export function parseLlmStructuredOutput(text: string | null): StructuredChatbotResponse {
  if (!text) return { answer: 'Mình chưa có câu trả lời phù hợp.' };

  const trimmed = text.trim();

  try {
    const data = JSON.parse(trimmed);
    if (typeof data === 'object' && data !== null && typeof data.answer === 'string') {
      return {
        answer: data.answer,
        remember: Array.isArray(data.remember) ? data.remember : undefined,
        sources: Array.isArray(data.sources) ? data.sources : undefined,
      };
    }
  } catch {
    // fallback to regex
  }

  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (typeof data === 'object' && data !== null && typeof data.answer === 'string') {
        return {
          answer: data.answer,
          remember: Array.isArray(data.remember) ? data.remember : undefined,
          sources: Array.isArray(data.sources) ? data.sources : undefined,
        };
      }
    } catch {
      // fallback to brace match
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const sub = trimmed.slice(firstBrace, lastBrace + 1);
      const data = JSON.parse(sub);
      if (typeof data === 'object' && data !== null && typeof data.answer === 'string') {
        return {
          answer: data.answer,
          remember: Array.isArray(data.remember) ? data.remember : undefined,
          sources: Array.isArray(data.sources) ? data.sources : undefined,
        };
      }
    } catch {
      // fallback
    }
  }

  return { answer: trimmed };
}

