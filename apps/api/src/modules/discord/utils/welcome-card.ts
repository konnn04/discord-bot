import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';

export interface WelcomeCardOptions {
  avatarUrl: string;
  title: string;
  subtitle: string;
}

const WIDTH = 1000;
const HEIGHT = 320;

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Truncate text with an ellipsis so it fits within maxWidth. */
function fitText(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

/**
 * Render a welcome card as a PNG buffer: gradient background, circular avatar
 * with a glowing ring, a "WELCOME" pill, plus title and subtitle text.
 */
export async function renderWelcomeCard(
  opts: WelcomeCardOptions,
): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(0.5, '#312e81');
  bg.addColorStop(1, '#4c1d95');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 32);
  ctx.fill();

  // Decorative soft circles
  ctx.save();
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 32);
  ctx.clip();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#a78bfa';
  ctx.beginPath();
  ctx.arc(880, 60, 160, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(120, 300, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Avatar
  const avatarSize = 180;
  const avatarX = 70;
  const avatarY = HEIGHT / 2 - avatarSize / 2;
  const cx = avatarX + avatarSize / 2;
  const cy = avatarY + avatarSize / 2;

  // Glowing ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, avatarSize / 2 + 8, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  const ring = ctx.createLinearGradient(
    avatarX,
    avatarY,
    avatarX + avatarSize,
    avatarY + avatarSize,
  );
  ring.addColorStop(0, '#c4b5fd');
  ring.addColorStop(1, '#f0abfc');
  ctx.strokeStyle = ring;
  ctx.stroke();
  ctx.restore();

  try {
    const avatar = await loadImage(opts.avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // Fallback: filled circle if the avatar can't be loaded
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#6d28d9';
    ctx.fill();
    ctx.restore();
  }

  const textX = avatarX + avatarSize + 50;
  const textMaxWidth = WIDTH - textX - 50;

  // "WELCOME" pill
  ctx.font = 'bold 26px sans-serif';
  const pillText = 'WELCOME';
  const pillPadX = 20;
  const pillW = ctx.measureText(pillText).width + pillPadX * 2;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, textX, 60, pillW, 44, 22);
  ctx.fill();
  ctx.fillStyle = '#e9d5ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, textX + pillPadX, 83);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitText(ctx, opts.title, textMaxWidth), textX, 190);

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '32px sans-serif';
  ctx.fillText(fitText(ctx, opts.subtitle, textMaxWidth), textX, 240);

  return canvas.toBuffer('image/png');
}
