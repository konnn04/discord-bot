/**
 * Utilities for fitting AI-generated replies into Discord's constraints:
 *  - Discord messages are capped at 2000 characters.
 *  - Very long fenced code blocks are better sent as file attachments.
 */

export const DISCORD_MESSAGE_LIMIT = 2000;

export type ReplyPart =
  | { kind: 'text'; content: string }
  | { kind: 'file'; filename: string; content: string; language: string };

const CODE_FILE_THRESHOLD = 1500;

const LANG_EXT: Record<string, string> = {
  ts: 'ts',
  typescript: 'ts',
  js: 'js',
  javascript: 'js',
  py: 'py',
  python: 'py',
  json: 'json',
  sh: 'sh',
  bash: 'sh',
  html: 'html',
  css: 'css',
  sql: 'sql',
  go: 'go',
  rust: 'rs',
  rs: 'rs',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  yaml: 'yaml',
  yml: 'yaml',
};

function extensionFor(language: string): string {
  return LANG_EXT[language.toLowerCase()] ?? 'txt';
}

export function splitText(
  text: string,
  limit: number = DISCORD_MESSAGE_LIMIT,
): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf('\n', limit);
    if (cut <= 0) cut = remaining.lastIndexOf(' ', limit);
    if (cut <= 0) cut = limit;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\s+/, '');
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export function buildReplyParts(
  reply: string,
  limit: number = DISCORD_MESSAGE_LIMIT,
): ReplyPart[] {
  const parts: ReplyPart[] = [];
  const fence = /```(\w*)\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let fileCount = 0;
  let match: RegExpExecArray | null;

  const pushText = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    for (const chunk of splitText(trimmed, limit)) {
      parts.push({ kind: 'text', content: chunk });
    }
  };

  while ((match = fence.exec(reply)) !== null) {
    const [full, lang, code] = match;
    const language = lang || 'txt';
    const body = code.replace(/\n$/, '');

    // Text before this code block
    pushText(reply.slice(lastIndex, match.index));
    lastIndex = match.index + full.length;

    if (body.length > CODE_FILE_THRESHOLD) {
      fileCount += 1;
      parts.push({
        kind: 'file',
        filename: `snippet-${fileCount}.${extensionFor(language)}`,
        content: body,
        language,
      });
    } else {
      const inline = '```' + language + '\n' + body + '\n```';
      if (inline.length <= limit) {
        parts.push({ kind: 'text', content: inline });
      } else {
        pushText(body);
      }
    }
  }

  pushText(reply.slice(lastIndex));

  return parts;
}
