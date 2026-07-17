import { ChannelType } from 'discord.js';
import {
  ok,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

export const guildInfoToolSchema: ToolSchema = {
  name: 'guild_info',
  description: 'Thông tin cơ bản của server hiện tại.',
  parameters: { type: 'object', properties: {} },
};

export interface GuildInfoData {
  id: string;
  name: string;
  memberCount: number;
  channelCount: number;
  textChannels: number;
  voiceChannels: number;
  roleCount: number;
  ownerId: string;
  createdAt: string;
}

/** Read basic info about the current guild. */
export function guildInfoAction(
  ctx: ActionContext,
): ActionResult<GuildInfoData> {
  const g = ctx.guild;
  const channels = g.channels.cache;
  const data: GuildInfoData = {
    id: g.id,
    name: g.name,
    memberCount: g.memberCount,
    channelCount: channels.size,
    textChannels: channels.filter((c) => c.type === ChannelType.GuildText).size,
    voiceChannels: channels.filter((c) => c.type === ChannelType.GuildVoice)
      .size,
    roleCount: g.roles.cache.size,
    ownerId: g.ownerId,
    createdAt: g.createdAt.toISOString(),
  };

  const message = [
    `Tên: ${data.name}`,
    `Số thành viên: ${data.memberCount}`,
    `Số kênh: ${data.channelCount}`,
    `Số role: ${data.roleCount}`,
    `Chủ server: <@${data.ownerId}>`,
    `Tạo lúc: ${data.createdAt.slice(0, 10)}`,
  ].join('\n');

  return ok(message, data);
}
