export interface ProviderInfo {
  id: 'agentrouter' | 'gemini' | 'deepseek';
  name: string;
  desc: string;
  hasSystemKey: boolean;
  defaultBaseUrl: string;
  models: string[];
}

export interface ChatbotConfigData {
  providers: ProviderInfo[];
  systemDefaults: {
    provider: 'agentrouter' | 'gemini' | 'deepseek';
    agentrouterModel: string;
    agentrouterBaseUrl: string;
  };
}

export interface ChatbotFormState {
  enabled: boolean;
  provider: 'agentrouter' | 'gemini' | 'deepseek';
  model: string;
  apiKey: string;
  baseUrl: string;
  allowedTools: string[];
  readImages: boolean;
  compressImages: boolean;
}

export interface TestResult {
  success: boolean;
  reply?: string;
  error?: string;
  latencyMs?: number;
  provider?: string;
  model?: string;
}

export const POPULAR_MODELS: Record<
  'agentrouter' | 'gemini' | 'deepseek',
  { name: string; tag?: string }[]
> = {
  agentrouter: [
    { name: 'deepseek-v4-flash', tag: 'Free Quota' },
    { name: 'gpt-5.6-sol', tag: 'Pool Quota' },
    { name: 'glm-5.3', tag: 'GLM' },
    { name: 'claude-opus-4-8', tag: 'Anthropic' },
  ],
  gemini: [
    { name: 'gemini-2.5-flash', tag: 'Nhanh' },
    { name: 'gemini-2.5-pro', tag: 'Thông minh' },
    { name: 'gemini-flash-lite-latest', tag: 'Tiết kiệm' },
  ],
  deepseek: [
    { name: 'deepseek-chat', tag: 'V3' },
    { name: 'deepseek-reasoner', tag: 'R1' },
  ],
};
