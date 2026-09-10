import type { LlmMessage, LlmResult, LlmTool, LlmToolCall } from '../llm.types';

// Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

export async function geminiChat(
  messages: LlmMessage[],
  tools: LlmTool[],
  customApiKey?: string,
  customModel?: string,
): Promise<LlmResult> {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const model = customModel?.trim() || DEFAULT_MODEL;

  const systemText = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const contents: any[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;

    if (m.role === 'user') {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.images?.length) {
        for (const img of m.images) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.base64,
            },
          });
        }
      }
      contents.push({ role: 'user', parts });
    } else if (m.role === 'assistant') {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const tc of m.toolCalls ?? []) {
        const part: any = { functionCall: { name: tc.name, args: tc.args } };
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

export async function fetchGeminiModels(apiKey?: string): Promise<string[]> {
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!key) {
    return [
      DEFAULT_MODEL,
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ];
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await fetch(url);
    if (res.ok) {
      const data: any = await res.json();
      const models: string[] = (data.models || [])
        .filter((m: any) =>
          Array.isArray(m.supportedGenerationMethods)
            ? m.supportedGenerationMethods.includes('generateContent')
            : true,
        )
        .map((m: any) => String(m.name).replace(/^models\//, ''))
        .filter((name: string) => name.startsWith('gemini'));
      if (models.length > 0) {
        return Array.from(new Set(models));
      }
    }
  } catch {
    // fallback
  }

  return [
    DEFAULT_MODEL,
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
  ];
}
