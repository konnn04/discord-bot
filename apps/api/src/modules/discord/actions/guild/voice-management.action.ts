import { ChannelType, type VoiceBasedChannel } from 'discord.js';
import type { ActionContext, ActionResult, ToolSchema } from '../types';
import { ok, fail } from '../types';

export const getVoiceMembersToolSchema: ToolSchema = {
  name: 'get_voice_members',
  description:
    'Lấy danh sách các thành viên hiện đang ở trong kênh thoại (voice channel) của người gọi bot ' +
    'hoặc kênh thoại được chỉ định.',
  parameters: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description: 'ID kênh thoại muốn xem (bỏ trống để lấy kênh thoại của người ra lệnh)',
      },
    },
  },
};

export interface VoiceMemberInfo {
  id: string;
  username: string;
  displayName: string;
  isMuted: boolean;
  isDeafened: boolean;
  isStreaming: boolean;
}

export async function getVoiceMembersAction(
  ctx: ActionContext,
  args: { channel_id?: string },
): Promise<ActionResult<VoiceMemberInfo[]>> {
  let voiceChannel: VoiceBasedChannel | null | undefined = null;

  if (args.channel_id) {
    const ch = await ctx.guild.channels.fetch(args.channel_id).catch(() => null);
    if (ch && ch.isVoiceBased()) voiceChannel = ch;
  } else {
    voiceChannel = ctx.actor?.voice?.channel ?? ctx.voiceChannel;
  }

  if (!voiceChannel) {
    return fail('Bạn chưa ở trong kênh thoại nào và không chỉ định kênh thoại hợp lệ.');
  }

  const members: VoiceMemberInfo[] = [];
  for (const m of voiceChannel.members.values()) {
    members.push({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      isMuted: Boolean(m.voice.mute || m.voice.selfMute),
      isDeafened: Boolean(m.voice.deaf || m.voice.selfDeaf),
      isStreaming: Boolean(m.voice.streaming),
    });
  }

  if (members.length === 0) {
    return ok(`Kênh thoại **${voiceChannel.name}** hiện không có ai.`, []);
  }

  const lines = members.map((m) => {
    const flags: string[] = [];
    if (m.isStreaming) flags.push('🎥 Đang stream');
    if (m.isMuted) flags.push('🔇 Mute');
    if (m.isDeafened) flags.push('🔈 Deaf');
    const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
    return `- ${m.displayName} (@${m.username}, ID: ${m.id})${flagStr}`;
  });

  const summary = `Có ${members.length} người trong phòng thoại **#${voiceChannel.name}**:\n${lines.join('\n')}`;
  return ok(summary, members);
}

export const moveVoiceMembersToolSchema: ToolSchema = {
  name: 'move_voice_members',
  description:
    'Di chuyển một hoặc nhiều thành viên (hoặc tất cả thành viên trong phòng thoại hiện tại) ' +
    'sang một kênh thoại khác.',
  parameters: {
    type: 'object',
    properties: {
      target_channel_id: {
        type: 'string',
        description: 'ID hoặc tên kênh thoại đích muốn chuyển đến',
      },
      member_ids: {
        type: 'string',
        description:
          'Danh sách ID thành viên cần chuyển (phân cách bởi dấu phẩy). ' +
          'Bỏ trống hoặc điền "all" để chuyển TẤT CẢ mọi người trong phòng hiện tại.',
      },
    },
    required: ['target_channel_id'],
  },
};

export async function moveVoiceMembersAction(
  ctx: ActionContext,
  args: { target_channel_id: string; member_ids?: string },
): Promise<ActionResult<{ movedCount: number; targetChannelName: string }>> {
  const query = String(args.target_channel_id || '').trim();
  if (!query) return fail('Vui lòng cung cấp ID hoặc tên kênh thoại đích.');

  // Find target voice channel by ID or name
  let targetChannel = ctx.guild.channels.cache.find(
    (c) => c.isVoiceBased() && (c.id === query || c.name.toLowerCase() === query.toLowerCase()),
  ) as VoiceBasedChannel | undefined;

  if (!targetChannel) {
    targetChannel = (await ctx.guild.channels.fetch(query).catch(() => null)) as
      | VoiceBasedChannel
      | undefined;
  }

  if (!targetChannel || !targetChannel.isVoiceBased()) {
    return fail(`Không tìm thấy kênh thoại đích hợp lệ: "${query}".`);
  }

  const currentChannel = ctx.actor?.voice?.channel ?? ctx.voiceChannel;
  let membersToMove: any[] = [];

  const rawIds = String(args.member_ids || '').trim();
  if (!rawIds || rawIds.toLowerCase() === 'all') {
    if (!currentChannel) {
      return fail('Bạn không ở trong phòng thoại nào để chuyển tất cả mọi người.');
    }
    membersToMove = [...currentChannel.members.values()];
  } else {
    const ids = rawIds.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    for (const id of ids) {
      const member = ctx.guild.members.cache.get(id) || (await ctx.guild.members.fetch(id).catch(() => null));
      if (member && member.voice.channel) {
        membersToMove.push(member);
      }
    }
  }

  if (membersToMove.length === 0) {
    return fail('Không tìm thấy thành viên nào đang ở trong voice để di chuyển.');
  }

  let movedCount = 0;
  const errors: string[] = [];

  for (const m of membersToMove) {
    try {
      await m.voice.setChannel(targetChannel);
      movedCount++;
    } catch (e) {
      errors.push(`${m.displayName}: ${String(e)}`);
    }
  }

  const msg =
    `Đã di chuyển ${movedCount}/${membersToMove.length} thành viên sang kênh thoại **#${targetChannel.name}**.` +
    (errors.length ? ` (Lỗi: ${errors.slice(0, 3).join(', ')})` : '');

  return ok(msg, { movedCount, targetChannelName: targetChannel.name });
}
