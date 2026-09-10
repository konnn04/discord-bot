import type { ActionContext, ActionResult, ToolSchema } from '../types';
import { ok, fail } from '../types';
import type { Message, TextChannel } from 'discord.js';

export const getChatHistoryToolSchema: ToolSchema = {
  name: 'get_chat_history',
  description:
    'Lấy lịch sử tin nhắn gần đây trong kênh chat (từ 10 đến 200 tin nhắn). ' +
    'Dùng công cụ này khi người dùng yêu cầu tóm tắt cuộc trò chuyện, hỏi ai vừa nói gì, hoặc nối tiếp ngữ cảnh.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        description: 'Số lượng tin nhắn cần lấy (từ 10 đến 200, mặc định 20)',
        minimum: 10,
        maximum: 200,
      },
      channel_id: {
        type: 'string',
        description: 'ID kênh chat cần lấy lịch sử (bỏ trống nếu lấy kênh hiện tại)',
      },
    },
  },
};

export interface ChatHistoryMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export async function getChatHistoryAction(
  ctx: ActionContext,
  args: { limit?: number; channel_id?: string },
): Promise<ActionResult<ChatHistoryMessage[]>> {
  const targetChannelId = args.channel_id || ctx.textChannelId;
  if (!targetChannelId) {
    return fail('Không xác định được kênh chat để lấy lịch sử.');
  }

  const channel = (await ctx.guild.channels.fetch(targetChannelId).catch(() => null)) as TextChannel | null;
  if (!channel || !channel.isTextBased()) {
    return fail(`Không tìm thấy kênh chat có ID ${targetChannelId}.`);
  }

  const requestedLimit = Math.min(200, Math.max(10, Number(args.limit) || 20));
  const fetchedMessages: Message[] = [];
  let lastId: string | undefined = undefined;

  try {
    while (fetchedMessages.length < requestedLimit) {
      const fetchBatchSize = Math.min(100, requestedLimit - fetchedMessages.length);
      const batch = await channel.messages.fetch({
        limit: fetchBatchSize,
        before: lastId,
      });

      if (batch.size === 0) break;

      for (const msg of batch.values()) {
        fetchedMessages.push(msg);
        lastId = msg.id;
      }

      if (batch.size < fetchBatchSize) break;
    }
  } catch (err) {
    return fail(`Không thể đọc lịch sử tin nhắn: ${String(err)}`);
  }

  // Sort chronologically (oldest to newest)
  fetchedMessages.reverse();

  const formattedData: ChatHistoryMessage[] = fetchedMessages.map((m) => ({
    id: m.id,
    authorId: m.author.id,
    authorName: m.member?.displayName ?? m.author.username,
    content: m.cleanContent || m.content || '[Không có nội dung văn bản]',
    createdAt: m.createdAt.toISOString(),
  }));

  const lines = formattedData.map((m) => {
    const timeStr = m.createdAt.slice(11, 16);
    return `[${timeStr}] ${m.authorName} (${m.authorId}): ${m.content.slice(0, 300)}`;
  });

  const summary =
    `Lịch sử ${formattedData.length} tin nhắn gần nhất trong #${channel.name}:\n` +
    lines.join('\n');

  return ok(summary, formattedData);
}
