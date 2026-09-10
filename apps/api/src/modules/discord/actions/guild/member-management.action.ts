import type { ActionContext, ActionResult, ToolSchema } from '../types';
import { ok, fail } from '../types';
import { ActivityType } from 'discord.js';

export const changeNicknameToolSchema: ToolSchema = {
  name: 'change_nickname',
  description:
    'Đổi biệt danh (nickname) của một thành viên trong server. ' +
    'Cần quyền quản lý biệt danh và vai trò của bot phải cao hơn người cần đổi.',
  parameters: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'ID hoặc username của thành viên cần đổi biệt danh',
      },
      nickname: {
        type: 'string',
        description: 'Biệt danh mới muốn đặt (để trống hoặc rỗng để xoá biệt danh về tên gốc)',
      },
    },
    required: ['user_id'],
  },
};

export async function changeNicknameAction(
  ctx: ActionContext,
  args: { user_id: string; nickname?: string },
): Promise<ActionResult<{ userId: string; oldName: string; newName: string }>> {
  const query = String(args.user_id || '').replace(/[<@!>]/g, '').trim();
  if (!query) return fail('Vui lòng cung cấp ID hoặc username của thành viên.');

  // Find member
  let targetMember = ctx.guild.members.cache.get(query);
  if (!targetMember) {
    targetMember = (await ctx.guild.members.fetch(query).catch(() => null)) ?? undefined;
  }
  if (!targetMember) {
    targetMember = ctx.guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === query.toLowerCase() ||
        m.displayName.toLowerCase() === query.toLowerCase(),
    );
  }

  if (!targetMember) {
    return fail(`Không tìm thấy thành viên phù hợp với "${query}".`);
  }

  const oldName = targetMember.displayName;
  const newName = (args.nickname || '').trim().slice(0, 32);

  try {
    await targetMember.setNickname(newName || null);
    return ok(
      `Đã đổi biệt danh của <@${targetMember.id}> từ "${oldName}" thành "${newName || targetMember.user.username}".`,
      { userId: targetMember.id, oldName, newName },
    );
  } catch (err) {
    return fail(`Không thể đổi biệt danh: ${String(err)} (có thể do bot không đủ quyền hoặc vị trí role thấp hơn người này).`);
  }
}

export const getUserActivityToolSchema: ToolSchema = {
  name: 'get_user_activity',
  description:
    'Xem trạng thái trực tuyến (online/idle/dnd/offline) và các hoạt động chi tiết ' +
    '(chơi game, nghe Spotify, xem stream, custom status) của một thành viên trong server.',
  parameters: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'ID, username hoặc biệt danh của người muốn xem',
      },
    },
    required: ['user_id'],
  },
};

export interface UserActivityData {
  userId: string;
  username: string;
  displayName: string;
  status: string;
  clientStatus?: { desktop?: string; mobile?: string; web?: string };
  activities: Array<{
    type: string;
    name: string;
    details?: string;
    state?: string;
  }>;
}

export async function getUserActivityAction(
  ctx: ActionContext,
  args: { user_id: string },
): Promise<ActionResult<UserActivityData>> {
  const query = String(args.user_id || '').replace(/[<@!>]/g, '').trim();
  if (!query) return fail('Vui lòng cung cấp ID hoặc username của thành viên.');

  let member = ctx.guild.members.cache.get(query);
  if (!member) {
    member = (await ctx.guild.members.fetch(query).catch(() => null)) ?? undefined;
  }
  if (!member) {
    member = ctx.guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === query.toLowerCase() ||
        m.displayName.toLowerCase() === query.toLowerCase(),
    );
  }

  if (!member) {
    return fail(`Không tìm thấy thành viên "${query}" trong server.`);
  }

  const presence = member.presence;
  const status = presence?.status ?? 'offline';

  const typeLabels: Record<number, string> = {
    [ActivityType.Playing]: '🎮 Đang chơi',
    [ActivityType.Streaming]: '📡 Đang stream',
    [ActivityType.Listening]: '🎧 Đang nghe',
    [ActivityType.Watching]: '📺 Đang xem',
    [ActivityType.Custom]: '💬 Trạng thái',
    [ActivityType.Competing]: '🏆 Đang thi đấu',
  };

  const activities = (presence?.activities ?? []).map((a) => ({
    type: typeLabels[a.type] || 'Hoạt động',
    name: a.name,
    details: a.details || undefined,
    state: a.state || undefined,
  }));

  const lines: string[] = [
    `👤 **${member.displayName}** (@${member.user.username})`,
    `Trạng thái: **${status.toUpperCase()}**`,
  ];

  if (presence?.clientStatus) {
    const devices: string[] = [];
    if (presence.clientStatus.desktop) devices.push('Máy tính');
    if (presence.clientStatus.mobile) devices.push('Điện thoại');
    if (presence.clientStatus.web) devices.push('Trình duyệt Web');
    if (devices.length) lines.push(`Thiết bị: ${devices.join(', ')}`);
  }

  if (activities.length > 0) {
    lines.push('Hoạt động hiện tại:');
    for (const act of activities) {
      let desc = `${act.type}: **${act.name}**`;
      if (act.details) desc += ` (${act.details})`;
      if (act.state) desc += ` - ${act.state}`;
      lines.push(`- ${desc}`);
    }
  } else {
    lines.push('Hiện không có hoạt động nào được ghi nhận.');
  }

  return ok(lines.join('\n'), {
    userId: member.id,
    username: member.user.username,
    displayName: member.displayName,
    status,
    clientStatus: presence?.clientStatus as any,
    activities,
  });
}
