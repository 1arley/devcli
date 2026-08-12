/* Provider definitions shared across chat and ai plugins */

export interface ProviderInfo {
  name: string
  baseUrl: string
  defaultModel: string
  models: string[]
  apiKeyLabel?: string
}

export const PROVIDERS: ProviderInfo[] = [
  {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini', 'o3-mini'],
  },
  {
    name: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
  },
  {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    name: 'zai',
    baseUrl: 'https://api.z.ai/v1',
    defaultModel: 'mistral-nemo-instruct-2407',
    models: ['mistral-nemo-instruct-2407', 'llama-3.1-8b-instruct', 'Qwen2.5-7B-Instruct'],
  },
  {
    name: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.5-pro-exp-03-25'],
  },
  {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'deepseek-r1-distill-llama-70b',
    ],
  },
  {
    name: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    models: [
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'meta-llama/Llama-3-70b-chat-hf',
      'meta-llama/Llama-3-8b-chat-hf',
    ],
  },
  {
    name: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    models: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'codestral-latest',
    ],
  },
  {
    name: 'xai',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-1212',
    models: ['grok-2-1212', 'grok-beta'],
  },
  {
    name: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi', 'deepseek-coder'],
    apiKeyLabel: 'none (local)',
  },
]

interface ProviderMap {
  [key: string]: ProviderInfo
}
export const PROVIDER_MAP: ProviderMap = Object.fromEntries(PROVIDERS.map((p) => [p.name, p]))

export function getProviderInfo(name: string): ProviderInfo {
  return (
    PROVIDER_MAP[name] ?? {
      name,
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
      models: ['gpt-4o-mini'],
    }
  )
}

export interface ProviderConfig {
  provider: string
  apiKey?: string
  model: string
  baseUrl: string
}

export function resolveProviderConfig(config: {
  ai?: {
    provider?: string
    apiKey?: string
    model?: string
    baseUrl?: string
  }
}): ProviderConfig {
  const provider = config.ai?.provider ?? 'openai'
  const info = getProviderInfo(provider)
  return {
    provider,
    apiKey: config.ai?.apiKey,
    model: config.ai?.model ?? info.defaultModel,
    baseUrl: config.ai?.baseUrl ?? info.baseUrl,
  }
}

export function isProviderLocal(provider: string): boolean {
  return provider === 'ollama'
}
