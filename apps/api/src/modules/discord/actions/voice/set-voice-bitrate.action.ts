import {
  ok,
  fail,
  type ActionContext,
  type ActionResult,
  type ToolSchema,
} from '../types';

export const setVoiceBitrateToolSchema: ToolSchema = {
  name: 'set_voice_bitrate',
  description:
    'Đổi bitrate (kbps) và/hoặc region của kênh thoại người yêu cầu đang ở.',
  parameters: {
    type: 'object',
    properties: {
      bitrate: { type: 'number', description: 'Bitrate kbps (8-96)' },
      region: {
        type: 'string',
        description: 'Region, ví dụ: singapore, japan, auto',
      },
    },
  },
};

export async function setVoiceBitrateAction(
  ctx: ActionContext,
  args: { bitrate?: number; region?: string },
): Promise<ActionResult> {
  const vc = ctx.voiceChannel ?? ctx.actor?.voice?.channel ?? null;
  if (!vc) return fail('Bạn cần ở trong kênh thoại.');

  try {
    const changes: string[] = [];
    if (args.bitrate != null) {
      const kbps = Math.min(Math.max(Number(args.bitrate), 8), 96);
      await vc.setBitrate(kbps * 1000);
      changes.push(`bitrate ${kbps}kbps`);
    }
    if (args.region != null) {
      const region =
        String(args.region) === 'auto' ? null : String(args.region);
      await vc.setRTCRegion(region);
      changes.push(`region ${args.region}`);
    }
    return changes.length
      ? ok(`Đã cập nhật ${changes.join(', ')}.`)
      : ok('Không có thay đổi nào.');
  } catch {
    return fail('Không cập nhật được kênh thoại (thiếu quyền?).');
  }
}
