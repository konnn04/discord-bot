/**
 * Provider-agnostic chat client with function-calling, supporting Gemini
 * (Flash Lite) and DeepSeek. Uses plain `fetch` — no SDK dependency.
 *
 * Runtime requires the matching API key in the environment:
 *   - Gemini:   GEMINI_API_KEY
 *   - DeepSeek: DEEPSEEK_API_KEY
 */

export type LlmProvider = 'gemini' | 'deepseek';

export interface LlmToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /**
   * Gemini requires the `thoughtSignature` returned with a functionCall to be
   * sent back on the same part in the next turn, otherwise it errors 400.
   * Opaque and provider-specific; ignored by DeepSeek.
   */
  thoughtSignature?: string;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: LlmToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface LlmTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmResult {
  text: string | null;
  toolCalls: LlmToolCall[];
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export function isProviderConfigured(provider: LlmProvider): boolean {
  return provider === 'gemini'
    ? Boolean(process.env.GEMINI_API_KEY)
    : Boolean(process.env.DEEPSEEK_API_KEY);
}

export async function llmChat(
  provider: LlmProvider,
  messages: LlmMessage[],
  tools: LlmTool[],
): Promise<LlmResult> {
  return provider === 'gemini'
    ? geminiChat(messages, tools)
    : deepseekChat(messages, tools);
}

async function deepseekChat(
  messages: LlmMessage[],
  tools: LlmTool[],
): Promise<LlmResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set');

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
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

// ────────────────────────────────── Gemini ─────────────────────────────────

async function geminiChat(
  messages: LlmMessage[],
  tools: LlmTool[],
): Promise<LlmResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const contents: any[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'assistant') {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const tc of m.toolCalls ?? []) {
        const part: any = { functionCall: { name: tc.name, args: tc.args } };
        // Preserve Gemini's thought signature so the next turn is accepted.
        if (tc.thoughtSignature) part.thoughtSignature = tc.thoughtSignature;
        parts.push(part);
      }
      contents.push({ role: 'model', parts });
    } else if (m.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: m.name,
              response: { result: m.content },
            },
          },
        ],
      });
    }
  }

  const body: Record<string, unknown> = { contents };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }
  if (tools.length) {
    body.tools = [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];
  let text: string | null = null;
  const toolCalls: LlmToolCall[] = [];
  for (const p of parts) {
    if (p.text) text = (text ?? '') + p.text;
    if (p.functionCall) {
      toolCalls.push({
        id: `${p.functionCall.name}-${toolCalls.length}`,
        name: p.functionCall.name,
        args: p.functionCall.args ?? {},
        thoughtSignature: p.thoughtSignature,
      });
    }
  }
  return { text, toolCalls };
}

function safeParse(s: unknown): Record<string, unknown> {
  if (typeof s !== 'string') return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
