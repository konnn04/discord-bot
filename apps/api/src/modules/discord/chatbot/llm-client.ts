import type {
  LlmChatOptions,
  LlmMessage,
  LlmProvider,
  LlmResult,
  LlmTool,
} from './llm/llm.types';
import { geminiChat, fetchGeminiModels } from './llm/providers/gemini.provider';
import {
  deepseekChat,
  fetchDeepSeekModels,
} from './llm/providers/deepseek.provider';
import {
  agentrouterChat,
  fetchAgentRouterModels,
  parseAgentRouterModels,
} from './llm/providers/agentrouter.provider';

export * from './llm/llm.types';
export { parseAgentRouterModels };

export function isProviderConfigured(
  provider: LlmProvider,
  customApiKey?: string,
): boolean {
  if (customApiKey?.trim()) return true;
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  if (provider === 'deepseek') return Boolean(process.env.DEEPSEEK_API_KEY);
  if (provider === 'agentrouter' || provider === 'openrouter') {
    return Boolean(
      process.env.OPENROUTER_API_KEY || process.env.AGENTROUTER_API_KEY,
    );
  }
  return false;
}

export async function fetchProviderModels(
  provider: LlmProvider,
  options?: { apiKey?: string; baseUrl?: string },
): Promise<string[]> {
  if (provider === 'agentrouter' || provider === 'openrouter') {
    return fetchAgentRouterModels(options?.apiKey, options?.baseUrl);
  }
  if (provider === 'gemini') {
    return fetchGeminiModels(options?.apiKey);
  }
  if (provider === 'deepseek') {
    return fetchDeepSeekModels(options?.apiKey);
  }
  return [];
}

export async function llmChat(
  provider: LlmProvider,
  messages: LlmMessage[],
  tools: LlmTool[],
  options?: LlmChatOptions,
): Promise<LlmResult> {
  if (provider === 'gemini') {
    return geminiChat(messages, tools, options?.apiKey, options?.model);
  }
  if (provider === 'deepseek') {
    return deepseekChat(messages, tools, options?.apiKey, options?.model);
  }
  if (provider === 'agentrouter' || provider === 'openrouter') {
    return agentrouterChat(messages, tools, options);
  }
  throw new Error(`Unsupported LLM provider: ${provider as string}`);
}
