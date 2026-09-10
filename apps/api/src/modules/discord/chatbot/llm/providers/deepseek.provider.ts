import type { LlmMessage, LlmResult, LlmTool, LlmToolCall } from '../llm.types';

// Docs: https://api-docs.deepseek.com/
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

function safeParse(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function deepseekChat(
  messages: LlmMessage[],
  tools: LlmTool[],
  customApiKey?: string,
  customModel?: string,
): Promise<LlmResult> {
  const apiKey = customApiKey?.trim() || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const model = customModel?.trim() || DEFAULT_MODEL;

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => {
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant',
          content: m.content || '',
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.args) },
          })),
        };
      }
      if (m.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: m.toolCallId,
          content: m.content,
        };
      }
      if (m.role === 'user' && m.images?.length) {
        return {
          role: 'user',
          content: `${m.content}\n\n[Lưu ý hệ thống: Người dùng có gửi kèm ${m.images.length} hình ảnh, nhưng mô hình DeepSeek hiện tại chỉ xử lý văn bản. Hãy phản hồi câu hỏi dựa trên văn bản.]`,
        };
      }
      return { role: m.role, content: m.content };
    }),
  };

  if (tools.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`DeepSeek error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const msg = data.choices?.[0]?.message ?? {};
  const toolCalls: LlmToolCall[] = (msg.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name,
    args: safeParse(tc.function?.arguments),
  }));

  return { text: msg.content ?? null, toolCalls };
}

export async function fetchDeepSeekModels(apiKey?: string): Promise<string[]> {
  const key = apiKey?.trim() || process.env.DEEPSEEK_API_KEY;
  if (!key) return [DEFAULT_MODEL, 'deepseek-reasoner'];

  try {
    const res = await fetch('https://api.deepseek.com/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data: any = await res.json();
      const models = (data.data || []).map((m: any) => String(m.id).trim());
      if (models.length > 0) {
        return Array.from(new Set(models));
      }
    }
  } catch {
    // fallback
  }

  return [DEFAULT_MODEL, 'deepseek-reasoner'];
}
