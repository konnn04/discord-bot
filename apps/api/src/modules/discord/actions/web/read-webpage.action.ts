import { ok, fail, type ActionResult, type ToolSchema } from '../types';

// Jina AI Reader: prefixing a URL with this host returns clean, LLM-ready
// text/markdown for the target page — no API key required for light use.
// Docs: https://jina.ai/reader
const JINA_READER_BASE = 'https://r.jina.ai/';
const MAX_CONTENT_LENGTH = 6000;
const FETCH_TIMEOUT_MS = 15000;

export const readWebpageToolSchema: ToolSchema = {
  name: 'read_web_page',
  description:
    'Đọc và tóm tắt nội dung của một trang web cụ thể khi người dùng gửi kèm link ' +
    'hoặc yêu cầu tra cứu một trang. CHỈ dùng khi đã có URL rõ ràng (http/https) — ' +
    'KHÔNG dùng để tìm kiếm trên Google hay các công cụ tìm kiếm khác.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description:
          'URL đầy đủ (bắt đầu bằng http:// hoặc https://) của trang cần đọc.',
      },
    },
    required: ['url'],
  },
};

export interface ReadWebpageData {
  url: string;
  content: string;
  truncated: boolean;
}

/** Fetch a page's readable text via the Jina Reader proxy for the chatbot to summarize. */
export async function readWebpageAction(args: {
  url: string;
}): Promise<ActionResult<ReadWebpageData>> {
  const rawUrl = String(args.url || '').trim();

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return fail(`URL không hợp lệ: "${rawUrl}".`);
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return fail('Chỉ hỗ trợ link http:// hoặc https://.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${JINA_READER_BASE}${target.toString()}`, {
      headers: { Accept: 'text/plain' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return fail(`Không thể đọc trang này (lỗi ${res.status}).`);
    }

    const text = (await res.text()).trim();
    if (!text) {
      return fail('Trang này không có nội dung đọc được.');
    }

    const truncated = text.length > MAX_CONTENT_LENGTH;
    const content = truncated ? `${text.slice(0, MAX_CONTENT_LENGTH)}…` : text;

    return ok(content, { url: target.toString(), content, truncated });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return fail('Trang tải quá lâu, vui lòng thử lại.');
    }
    return fail('Không thể truy cập trang này lúc này.');
  } finally {
    clearTimeout(timeout);
  }
}
