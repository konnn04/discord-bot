import type { ActionCommand } from 'shared/src/types/discord.types';
import { ContextAdapter } from '../../contexts/context-adapter';
import { EmbedBuilder, AttachmentBuilder, Attachment } from 'discord.js';
import QRCode from 'qrcode';
import sharp from 'sharp';

const colorMap: Record<string, string> = {
  red: '#ff0000',
  blue: '#0000ff',
  green: '#008000',
  yellow: '#ffff00',
  black: '#000000',
  white: '#ffffff',
  purple: '#800080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  cyan: '#00ffff',
  gray: '#808080',
  grey: '#808080',
};

const parseColor = (colorStr: string): string => {
  const clean = colorStr.toLowerCase().replace('#', '').trim();
  if (colorMap[clean]) return colorMap[clean];
  if (/^[0-9A-Fa-f]{3,6}$/.test(clean)) {
    return `#${clean}`;
  }
  return '#000000';
};

const parseColorHex = (colorStr: string): number => {
  const hex = parseColor(colorStr).replace('#', '');
  return parseInt(hex, 16);
};

const qr: ActionCommand = {
  name: 'qr',
  description: 'Tạo mã QR từ văn bản hoặc link',
  category: 'common',
  optionalArgs: [
    {
      name: 'text',
      description: 'Văn bản hoặc link cần tạo QR',
      type: 'STRING',
      required: true,
    },
    {
      name: 'icon',
      description: 'Icon ở giữa QR (ảnh vuông)',
      type: 'ATTACHMENT',
      required: false,
    },
    {
      name: 'color',
      description: 'Màu QR (mã hex: #ff0000 hoặc tên: red, blue...)',
      type: 'STRING',
      required: false,
    },
    {
      name: 'title',
      description: 'Tiêu đề cho QR',
      type: 'STRING',
      required: false,
    },
    {
      name: 'description',
      description: 'Mô tả ngắn cho QR',
      type: 'STRING',
      required: false,
    },
  ],

  async execute(ctx: ContextAdapter) {
    await ctx.defer();

    const text = ctx.getOption('text', 'string') as string;
    const icon = ctx.getOption('icon', 'attachment') as Attachment | null;
    const colorParam = (ctx.getOption('color', 'string') as string) || 'black';
    const title = ctx.getOption('title', 'string') as string | null;
    const description = ctx.getOption('description', 'string') as string | null;

    const darkColor = parseColor(colorParam);
    const size = 500;

    try {
      let qrBuffer = await QRCode.toBuffer(text, {
        width: size,
        margin: 2,
        color: {
          dark: darkColor,
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });

      if (icon && icon.url) {
        try {
          const iconRes = await fetch(icon.url);
          const iconArrayBuffer = await iconRes.arrayBuffer();
          const iconBuffer = Buffer.from(iconArrayBuffer);

          const iconSize = Math.floor(size * 0.25);

          const processedIcon = await sharp(iconBuffer)
            .resize(iconSize, iconSize, { fit: 'cover' })
            .composite([
              {
                input: Buffer.from(
                  `<svg width="${iconSize}" height="${iconSize}"><rect x="0" y="0" width="${iconSize}" height="${iconSize}" rx="${Math.floor(iconSize * 0.2)}" ry="${Math.floor(iconSize * 0.2)}" fill="none" stroke="${darkColor}" stroke-width="4"/></svg>`,
                ),
                blend: 'over',
              },
            ])
            .png()
            .toBuffer();

          const bgPadding = 4;
          const bgSize = iconSize + bgPadding * 2;
          const whiteBg = await sharp({
            create: {
              width: bgSize,
              height: bgSize,
              channels: 4,
              background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
          })
            .png()
            .toBuffer();

          qrBuffer = await sharp(qrBuffer)
            .composite([
              { input: whiteBg, gravity: 'center' },
              { input: processedIcon, gravity: 'center' },
            ])
            .png()
            .toBuffer();
        } catch (iconErr) {
          console.error('[qr] Error processing icon:', iconErr);
        }
      }

      const attachment = new AttachmentBuilder(qrBuffer, {
        name: 'qrcode.png',
      });

      const embed = new EmbedBuilder()
        .setColor(parseColorHex(colorParam))
        .setImage('attachment://qrcode.png')
        .setTimestamp();

      if (title) {
        embed.setTitle(title);
      } else {
        embed.setTitle('📱 Mã QR của bạn');
      }

      if (description) {
        embed.setDescription(description);
      }

      await ctx.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('[qr] Error generating QR:', error);
      await ctx.editReply('❌ Đã xảy ra lỗi khi tạo mã QR.');
    }
  },
};

export default qr;
