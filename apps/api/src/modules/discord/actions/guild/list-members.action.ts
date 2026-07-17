import {
  ok,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

export interface MemberBrief {
  id: string;
  displayName: string;
}

export const listMembersToolSchema: ToolSchema = {
  name: 'list_members',
  description: 'Liệt kê một số thành viên trong server.',
  parameters: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Số lượng (tối đa 25)' },
    },
  },
};

export function listMembersAction(
  ctx: ActionContext,
  args: { limit?: number },
): ActionResult<MemberBrief[]> {
  const limit = Math.min(Number(args.limit) || 15, 25);
  const members = [...ctx.guild.members.cache.values()]
    .filter((m) => !m.user.bot)
    .slice(0, limit)
    .map((m) => ({ id: m.id, displayName: m.displayName }));

  const message = members.length
    ? members.map((m) => m.displayName).join(', ')
    : 'Không có thành viên nào.';
  return ok(message, members);
}
