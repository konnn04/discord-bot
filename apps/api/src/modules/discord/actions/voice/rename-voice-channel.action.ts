import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

export const renameVoiceChannelToolSchema: ToolSchema = {
  name: 'rename_voice_channel',
  description: 'Đổi tên kênh thoại mà người yêu cầu đang ở.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Tên mới cho kênh thoại' },
    },
    required: ['name'],
  },
};

export async function renameVoiceChannelAction(
  ctx: ActionContext,
  args: { name: string },
): Promise<ActionResult> {
  const vc = ctx.voiceChannel ?? ctx.actor?.voice?.channel ?? null;
  if (!vc) return fail('Bạn cần ở trong kênh thoại.');

  const name = String(args.name || '').slice(0, 100);
  if (!name) return fail('Thiếu tên mới.');

  try {
    await vc.setName(name);
    return ok(`Đã đổi tên kênh thoại thành "${name}".`);
  } catch {
    return fail('Không đổi được tên kênh (thiếu quyền?).');
  }
}
