import type {
  LlmChatOptions,
  LlmMessage,
  LlmResult,
  LlmTool,
  LlmToolCall,
} from '../llm.types';

// OpenAI Compatible Endpoint: https://platform.openai.com/docs/api-reference/chat
const VIETNAMESE_CHAR_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function safeParse(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function parseAgentRouterModels(envModel?: string): string[] {
  const raw = envModel || process.env.OPENROUTER_MODEL;
  if (!raw) return ['deepseek-v4-flash', 'gpt-5.6-sol', 'glm-5.3', 'claude-opus-4-8'];

  let list: string[] = [];
  try {
    const jsonStr = raw.replace(/'/g, '"');
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      list = parsed.map((s) => String(s).trim()).filter(Boolean);
    }
  } catch {
    list = raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) => s.replace(/['"]/g, '').trim())
      .filter(Boolean);
  }
  if (!list.length) list = [raw.trim()];
  return Array.from(new Set(list));
}

export async function fetchAgentRouterModels(
  apiKey?: string,
  baseUrlInput?: string,
): Promise<string[]> {
  const key =
    apiKey?.trim() ||
    process.env.OPENROUTER_API_KEY ||
    process.env.AGENTROUTER_API_KEY;
  if (!key) return parseAgentRouterModels();

  let baseUrl =
    baseUrlInput?.trim() ||
    process.env.OPENROUTER_BASE_URL ||
    'https://agentrouter.org';
  baseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = baseUrl.endsWith('/v1')
    ? `${baseUrl}/models`
    : `${baseUrl}/v1/models`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${key}`,
        'User-Agent': 'opencode/1.0.0',
      },
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
  return parseAgentRouterModels();
}

async function translateVietnameseToEnglish(text: string): Promise<string> {
  if (!text || !VIETNAMESE_CHAR_REGEX.test(text)) return text;
  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' +
      encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) return text;
    const data: any = await res.json();
    return data[0].map((s: any) => s[0]).join('');
  } catch {
    return text;
  }
}

export async function agentrouterChat(
  messages: LlmMessage[],
  tools: LlmTool[],
  options?: LlmChatOptions,
): Promise<LlmResult> {
  const apiKey =
    options?.apiKey?.trim() ||
    process.env.OPENROUTER_API_KEY ||
    process.env.AGENTROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY (or AGENTROUTER_API_KEY) not set');
  }

  let baseUrl =
    options?.baseUrl?.trim() ||
    process.env.OPENROUTER_BASE_URL ||
    'https://agentrouter.org';
  baseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = baseUrl.endsWith('/v1')
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/v1/chat/completions`;

  const availableModels = parseAgentRouterModels();
  const model = options?.model?.trim() || availableModels[0] || 'deepseek-v4-flash';

  const hasVietnamese = messages.some((m) =>
    VIETNAMESE_CHAR_REGEX.test(m.content),
  );

  let processedMessages = messages;
  if (hasVietnamese) {
    processedMessages = await Promise.all(
      messages.map(async (m) => {
        let content = m.content;
        if (VIETNAMESE_CHAR_REGEX.test(content)) {
          content = await translateVietnameseToEnglish(content);
        }
        if (m.role === 'system') {
          content +=
            '\n\n[CRITICAL NOTE: The user communicates in Vietnamese. You MUST formulate your entire final output directly in natural Vietnamese as requested.]';
        }
        return { ...m, content };
      }),
    );
  }

  const body: Record<string, unknown> = {
    model,
    messages: processedMessages.map((m) => {
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
        const parts: any[] = [];
        if (m.content) parts.push({ type: 'text', text: m.content });
        for (const img of m.images) {
          parts.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
          });
        }
        return { role: 'user', content: parts };
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

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'opencode/1.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`AgentRouter error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const choice = data.choices?.[0]?.message ?? {};
  const toolCalls: LlmToolCall[] = (choice.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name,
    args: safeParse(tc.function?.arguments),
  }));

  return { text: choice.content ?? null, toolCalls };
}
