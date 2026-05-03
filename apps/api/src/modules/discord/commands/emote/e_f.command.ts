import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { AttachmentBuilder, User } from 'discord.js';
import sharp from 'sharp';
import { join } from 'path';

const IMAGE_PATH = join(process.cwd(), 'assets', 'images', 'f_for_pray.png');

// Position and size of the white frame in f_for_pray.png (1200x675)
const FRAME_X = 525;
const FRAME_Y = 150;
const FRAME_W = 256;
const FRAME_H = 226;

const eF: ActionCommand = {
  name: 'e_f',
  description: 'Press F to pay respects 🫡',
  category: 'emote',
  optionalArgs: [
    {
      name: 'user',
      description: 'Người cần F (mặc định là bản thân)',
      type: 'USER',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter) {
    const target = (ctx.getOption('user', 'user') as User | null) || ctx.author;

    try {
      const avatarUrl = target.displayAvatarURL({
        extension: 'png',
        size: 256,
      });

      const avatarResponse = await fetch(avatarUrl);
      const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());

      const BORDER = 6;

      const innerW = FRAME_W - BORDER * 2;
      const innerH = FRAME_H - BORDER * 2;

      const resizedAvatar = await sharp(avatarBuffer)
        .resize(innerW, innerH, { fit: 'cover' })
        .extend({
          top: BORDER,
          bottom: BORDER,
          left: BORDER,
          right: BORDER,
          background: { r: 40, g: 30, b: 20, alpha: 1 },
        })
        .png()
        .toBuffer();

      const composited = await sharp(IMAGE_PATH)
        .composite([
          {
            input: resizedAvatar,
            left: FRAME_X,
            top: FRAME_Y,
          },
        ])
        .png()
        .toBuffer();

      const attachment = new AttachmentBuilder(composited, {
        name: 'f_to_pay_respects.png',
      });

      const displayName = target.displayName || target.username;
      const msg = await ctx.reply({
        content: `**${displayName}** — Press F to pay respects 🫡`,
        files: [attachment],
      });

      if (msg) {
        const message = 'fetch' in msg ? await msg.fetch() : msg;
        await message.react('🇫').catch(() => {});
      }
    } catch (error) {
      console.error('[e_f] Error:', error);
      await ctx.reply('❌ Không thể tạo ảnh. Vui lòng thử lại.');
    }
  },
};

export default eF;
