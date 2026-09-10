import type { ActionContext, ActionResult, ToolSchema } from '../types';
import { ok, fail } from '../types';
import { getGuildMemoryService } from '../../chatbot/memory.service';

export const searchMemoryToolSchema: ToolSchema = {
  name: 'search_memory',
  description:
    'Tìm kiếm thông tin đã được ghi nhớ trong ký ức của server này (ví dụ: ai là ai, sở thích, thông tin cá nhân, sự kiện trong server). ' +
    'Dữ liệu được lưu biệt lập theo từng server.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Từ khoá hoặc tên người, chủ đề cần tra cứu trong ký ức server',
      },
    },
    required: ['query'],
  },
};

export async function searchMemoryAction(
  ctx: ActionContext,
  args: { query: string },
): Promise<ActionResult<Array<{ key: string; value: string }>>> {
  const query = String(args.query || '').trim();
  if (!query) return fail('Vui lòng cung cấp từ khoá tra cứu.');

  const memoryService = getGuildMemoryService(ctx.deps.prisma);
  const found = await memoryService.search(ctx.guild.id, query, 5);

  if (found.length === 0) {
    return ok(`Chưa có thông tin ghi nhớ nào phù hợp với từ khoá "${query}" trong server này.`, []);
  }

  const lines = found.map((m) => `- [**${m.key}**]: ${m.value}`);
  const summary = `Tìm thấy ${found.length} ký ức liên quan đến "${query}":\n${lines.join('\n')}`;

  return ok(summary, found);
}
