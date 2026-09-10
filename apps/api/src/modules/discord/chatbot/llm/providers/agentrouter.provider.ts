import type {
  LlmChatOptions,
  LlmMessage,
  LlmResult,
  LlmTool,
  LlmToolCall,
} from '../llm.types';
import { getDashboardUrl } from '../../../constants';

// OpenAI Compatible Endpoint: https://platform.openai.com/docs/api-reference/chat

/**
 * Resolve the versioned API root for a configured base URL. OpenRouter's real
 * API lives under `/api/v1` (e.g. `https://openrouter.ai/api/v1/...`), while
 * other OpenAI-compatible proxies (AgentRouter, self-hosted gateways) usually
 * serve `/v1` directly off their root. Accept either form regardless of
 * whether the admin included `/api` and/or `/v1` in OPENROUTER_BASE_URL.
 */
function resolveBaseUrl(rawBaseUrl: string): string {
  let url = rawBaseUrl.replace(/\/+$/, '');
  if (url.endsWith('/v1')) return url;
  try {
    if (
      /(^|\.)openrouter\.ai$/i.test(new URL(url).hostname) &&
      !url.endsWith('/api')
    ) {
      url = `${url}/api`;
    }
  } catch {
    // rawBaseUrl wasn't a valid absolute URL — leave as-is, fetch() will surface the error
  }
  return `${url}/v1`;
}

function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'User-Agent': 'opencode/1.0.0',
    // Optional OpenRouter ranking attribution — ignored by other proxies.
    'HTTP-Referer': getDashboardUrl(),
    'X-Title': 'FoxyBot',
  };
}

function safeParse(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

const POLICY_BLOCK_MARKERS = [
  'content_policy',
  'content policy',
  'content_filter',
  'moderation',
  'flagged',
  'unsafe',
];

function buildRequestError(status: number, rawText: string): Error {
  let detail = rawText;
  try {
    const parsed = JSON.parse(rawText) as {
      error?: { message?: string };
      message?: string;
    };
    detail = parsed?.error?.message || parsed?.message || rawText;
  } catch {
    // rawText wasn't JSON — use it as-is
  }
  const lower = detail.toLowerCase();
  if (POLICY_BLOCK_MARKERS.some((marker) => lower.includes(marker))) {
    return new Error(`content-blocked: ${detail}`);
  }
  return new Error(`AgentRouter error ${status}: ${detail}`);
}

export function parseAgentRouterModels(envModel?: string): string[] {
  const raw = envModel || process.env.OPENROUTER_MODEL;
  if (!raw) return ['deepseek/deepseek-v4-flash:free'];

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

  const baseUrl =
    baseUrlInput?.trim() ||
    process.env.OPENROUTER_BASE_URL ||
    'https://openrouter.ai/api';
  const endpoint = `${resolveBaseUrl(baseUrl)}/models`;

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

  const baseUrl =
    options?.baseUrl?.trim() ||
    process.env.OPENROUTER_BASE_URL ||
    'https://openrouter.ai/api';
  const endpoint = `${resolveBaseUrl(baseUrl)}/chat/completions`;

  const availableModels = parseAgentRouterModels();
  const model =
    options?.model?.trim() ||
    availableModels[0] ||
    'deepseek/deepseek-v4-flash:free';

  const SAFETY_CONTEXT =
    '\n\n[Context: This is a Discord server management bot. ' +
    'All content is from real users in a private Vietnamese Discord community. ' +
    'Vietnamese language must not be flagged as unsafe. ' +
    'Respond naturally in the same language the user used.]';

  const processedMessages = messages.map((m) => {
    if (m.role === 'system') {
      return { ...m, content: m.content + SAFETY_CONTEXT };
    }
    return m;
  });

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
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw buildRequestError(res.status, await res.text());
  }

  const data: any = await res.json();
  const firstChoice = data.choices?.[0] ?? {};
  const choice = firstChoice.message ?? {};

  if (
    firstChoice.finish_reason === 'content_filter' &&
    !choice.content &&
    !choice.tool_calls?.length
  ) {
    throw new Error('content-blocked: response finish_reason=content_filter');
  }

  const toolCalls: LlmToolCall[] = (choice.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name,
    args: safeParse(tc.function?.arguments),
  }));

  return { text: choice.content ?? null, toolCalls };
}
