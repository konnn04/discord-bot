export type LlmProvider = 'gemini' | 'deepseek' | 'agentrouter' | 'openrouter';

export interface LlmToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  thoughtSignature?: string;
}

export interface LlmImage {
  mimeType: string;
  base64: string;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: LlmImage[];
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

export interface LlmChatOptions {
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}
