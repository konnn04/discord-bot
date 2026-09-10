import { GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'fs';
import { join } from 'path';

let fontsLoaded = false;

export function initCanvasFonts(): void {
  if (fontsLoaded) return;

  const candidates = [
    join(process.cwd(), 'apps', 'api', 'assets', 'fonts'),
    join(process.cwd(), 'assets', 'fonts'),
    join(__dirname, '..', '..', '..', '..', 'assets', 'fonts'),
    join(__dirname, '..', '..', '..', '..', '..', 'assets', 'fonts'),
    join(__dirname, '..', '..', '..', '..', '..', '..', 'assets', 'fonts'),
    join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'assets', 'fonts'),
  ];

  for (const dir of candidates) {
    const regular = join(dir, 'Roboto-Regular.ttf');
    const bold = join(dir, 'Roboto-Bold.ttf');
    if (existsSync(regular)) {
      GlobalFonts.registerFromPath(regular, 'Roboto');
      if (existsSync(bold)) {
        GlobalFonts.registerFromPath(bold, 'Roboto');
      }
      break;
    }
  }

  try {
    (GlobalFonts as any).loadSystemFonts?.();
  } catch {}

  fontsLoaded = true;
}

initCanvasFonts();
