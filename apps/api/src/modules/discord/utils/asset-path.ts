import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Resolve a path under the repo's `assets/` directory regardless of the
 * process cwd (dev vs. built dist vs. Docker WORKDIR differ). Mirrors the
 * candidate-directory approach used by canvas-fonts.ts.
 */
export function resolveAssetPath(...segments: string[]): string | null {
  const candidates = [
    join(process.cwd(), 'apps', 'api', 'assets', ...segments),
    join(process.cwd(), 'assets', ...segments),
    join(__dirname, '..', '..', '..', '..', 'assets', ...segments),
    join(__dirname, '..', '..', '..', '..', '..', 'assets', ...segments),
    join(__dirname, '..', '..', '..', '..', '..', '..', 'assets', ...segments),
    join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '..',
      '..',
      '..',
      'assets',
      ...segments,
    ),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}
