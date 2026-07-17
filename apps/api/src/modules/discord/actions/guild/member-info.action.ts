import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

export const memberInfoToolSchema: ToolSchema = {
  name: 'member_info',
  description: 'Thông tin chi tiết của một thành viên theo tên hoặc ID.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Tên hiển thị hoặc ID' },
    },
    required: ['query'],
  },
};

export interface MemberInfoData {
  id: string;
  displayName: string;
  username: string;
  joinedAt: string | null;
  roleCount: number;
}

/** Look up a member by id, display name, or username (substring). */
export function memberInfoAction(
  ctx: ActionContext,
  args: { query: string },
): ActionResult<MemberInfoData> {
  const q = String(args.query || '').toLowerCase();
  if (!q) return fail('Thiếu tên hoặc ID thành viên.');

  const member =
    ctx.guild.members.cache.get(q) ||
    ctx.guild.members.cache.find(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.user.username.toLowerCase().includes(q),
    );
  if (!member) return fail(`Không tìm thấy thành viên "${args.query}".`);

  const data: MemberInfoData = {
    id: member.id,
    displayName: member.displayName,
    username: member.user.username,
    joinedAt: member.joinedAt?.toISOString() ?? null,
    roleCount: member.roles.cache.size - 1,
  };
  const message = [
    `Tên: ${data.displayName} (@${data.username})`,
    `ID: ${data.id}`,
    `Tham gia: ${data.joinedAt?.slice(0, 10) ?? 'không rõ'}`,
    `Số role: ${data.roleCount}`,
  ].join('\n');

  return ok(message, data);
}
