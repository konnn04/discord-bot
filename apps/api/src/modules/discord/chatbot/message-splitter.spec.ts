import {
  splitText,
  buildReplyParts,
  DISCORD_MESSAGE_LIMIT,
} from './message-splitter';

describe('splitText', () => {
  it('keeps short text as a single chunk', () => {
    expect(splitText('hello world')).toEqual(['hello world']);
  });

  it('splits long text into <=limit chunks', () => {
    const text = 'a'.repeat(4500);
    const chunks = splitText(text);
    expect(chunks.length).toBe(3);
    for (const c of chunks)
      expect(c.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
    expect(chunks.join('')).toBe(text);
  });

  it('prefers to break on newlines', () => {
    const text = 'line1\n' + 'x'.repeat(10);
    const chunks = splitText(text, 8);
    expect(chunks[0]).toBe('line1');
  });
});

describe('buildReplyParts', () => {
  it('returns a single text part for a plain reply', () => {
    const parts = buildReplyParts('just some text');
    expect(parts).toEqual([{ kind: 'text', content: 'just some text' }]);
  });

  it('keeps small code blocks inline', () => {
    const parts = buildReplyParts('before\n```ts\nconst x = 1;\n```\nafter');
    expect(parts.some((p) => p.kind === 'file')).toBe(false);
    expect(
      parts.filter((p) => p.kind === 'text').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('converts a large code block into a file attachment', () => {
    const bigCode = 'const x = 1;\n'.repeat(200); // > threshold
    const parts = buildReplyParts('here is code:\n```ts\n' + bigCode + '```');
    const file = parts.find((p) => p.kind === 'file');
    expect(file).toBeDefined();
    if (file && file.kind === 'file') {
      expect(file.filename).toMatch(/\.ts$/);
      expect(file.content).toContain('const x = 1;');
    }
  });

  it('every text part respects the Discord limit', () => {
    const reply = 'word '.repeat(1000);
    const parts = buildReplyParts(reply);
    for (const p of parts) {
      if (p.kind === 'text') {
        expect(p.content.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
      }
    }
  });
});
