import type { ProviderConfig } from './providers'
import { isProviderLocal } from './providers'
import type { ToolDefinition } from './tools'

export interface StreamMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCallId?: string
  toolCalls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  name?: string
}

export interface StreamChunk {
  type: 'content' | 'tool_calls' | 'done' | 'error'
  content?: string
  toolCalls?: Array<{
    index: number
    id?: string
    function?: { name?: string; arguments?: string }
  }>
  error?: string
}

export interface StreamResult {
  content: string
  toolCalls: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

export async function* streamChat(
  messages: StreamMessage[],
  providerConfig: ProviderConfig,
  tools: ToolDefinition[],
): AsyncGenerator<StreamChunk> {
  const { provider, apiKey } = providerConfig

  if (!apiKey && !isProviderLocal(provider)) {
    yield { type: 'error', error: 'No API key configured. Run: dev ai setup' }
    return
  }

  if (provider === 'gemini') {
    yield* streamGemini(messages, providerConfig, tools)
    return
  }

  if (provider === 'anthropic') {
    yield* streamAnthropic(messages, providerConfig, tools)
    return
  }

  yield* streamOpenAICompatible(messages, providerConfig, tools)
}

async function* streamOpenAICompatible(
  messages: StreamMessage[],
  config: ProviderConfig,
  tools: ToolDefinition[],
): AsyncGenerator<StreamChunk> {
  const url = `${config.baseUrl}/chat/completions`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
      ...(m.name ? { name: m.name } : {}),
    })),
    stream: true,
    max_tokens: 4096,
  }

  if (tools.length > 0) {
    body['tools'] = tools
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : String(err) }
    return
  }

  if (!response.ok) {
    const text = await response.text()
    yield { type: 'error', error: `HTTP ${response.status}: ${text}` }
    return
  }

  if (!response.body) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const toolCallMap = new Map<
    number,
    { id: string; function: { name: string; arguments: string } }
  >()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          yield { type: 'done' }
          return
        }
        try {
          const parsed = JSON.parse(data)
          const choice = parsed.choices?.[0]
          if (!choice) continue

          const delta = choice.delta
          if (!delta) continue

          if (delta.content) {
            yield { type: 'content', content: delta.content }
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0
              if (idx >= 0) {
                if (!toolCallMap.has(idx)) {
                  toolCallMap.set(idx, {
                    id: tc.id ?? `tc-${idx}`,
                    function: { name: '', arguments: '' },
                  })
                }
                const entry = toolCallMap.get(idx)!
                if (tc.id) entry.id = tc.id
                if (tc.function?.name) entry.function.name += tc.function.name
                if (tc.function?.arguments) entry.function.arguments += tc.function.arguments
              }
            }
            yield {
              type: 'tool_calls',
              toolCalls: Array.from(toolCallMap.entries()).map(([index, entry]) => ({
                index,
                id: entry.id,
                function: { name: entry.function.name, arguments: entry.function.arguments },
              })),
            }
          }
        } catch {
          continue
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (toolCallMap.size > 0) {
    const toolCalls = Array.from(toolCallMap.values()).map((entry) => ({
      ...entry,
      type: 'function' as const,
    }))
    for (const tc of toolCalls) {
      yield { type: 'tool_calls', toolCalls: [{ index: 0, id: tc.id, function: tc.function }] }
    }
  }

  yield { type: 'done' }
}

async function* streamAnthropic(
  messages: StreamMessage[],
  config: ProviderConfig,
  tools: ToolDefinition[],
): AsyncGenerator<StreamChunk> {
  const url = `${config.baseUrl}/messages`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey ?? '',
    'anthropic-version': '2023-06-01',
  }

  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: 4096,
    stream: true,
    messages: nonSystemMessages.map((m) => ({
      role: m.role === 'tool' ? 'user' : m.role,
      content:
        m.role === 'tool'
          ? [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]
          : m.content,
    })),
    ...(systemMessages.length > 0
      ? { system: systemMessages.map((m) => m.content).join('\n') }
      : {}),
  }

  if (tools.length > 0) {
    body['tools'] = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }))
  }

  let response: Response
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : String(err) }
    return
  }

  if (!response.ok) {
    const text = await response.text()
    yield { type: 'error', error: `HTTP ${response.status}: ${text}` }
    return
  }

  if (!response.body) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        try {
          const parsed = JSON.parse(data)

          if (parsed.type === 'content_block_delta') {
            if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
              yield { type: 'content', content: parsed.delta.text }
            }
            if (parsed.delta?.type === 'input_json_delta' && parsed.delta?.partial_json) {
              yield {
                type: 'tool_calls',
                toolCalls: [
                  {
                    index: parsed.index ?? 0,
                    function: { arguments: parsed.delta.partial_json },
                  },
                ],
              }
            }
          } else if (parsed.type === 'message_stop') {
            yield { type: 'done' }
            return
          } else if (parsed.type === 'content_block_start') {
            if (parsed.content_block?.type === 'tool_use') {
              yield {
                type: 'tool_calls',
                toolCalls: [
                  {
                    index: parsed.index ?? 0,
                    id: parsed.content_block.id,
                    function: {
                      name: parsed.content_block.name,
                      arguments: '',
                    },
                  },
                ],
              }
            }
          }
        } catch {
          continue
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

async function* streamGemini(
  messages: StreamMessage[],
  config: ProviderConfig,
  _tools: ToolDefinition[],
): AsyncGenerator<StreamChunk> {
  const url = `${config.baseUrl}/models/${config.model}:streamGenerateContent?key=${config.apiKey}&alt=sse`

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const systemMessages = messages.filter((m) => m.role === 'system')

  const body: Record<string, unknown> = {
    contents,
    ...(systemMessages.length > 0
      ? {
          systemInstruction: { parts: [{ text: systemMessages.map((m) => m.content).join('\n') }] },
        }
      : {}),
    generationConfig: { maxOutputTokens: 4096 },
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : String(err) }
    return
  }

  if (!response.ok) {
    const text = await response.text()
    yield { type: 'error', error: `HTTP ${response.status}: ${text}` }
    return
  }

  if (!response.body) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        try {
          const parsed = JSON.parse(data)
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            yield { type: 'content', content: text }
          }
        } catch {
          continue
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

export async function collectStreamResult(
  gen: AsyncGenerator<StreamChunk>,
  onChunk?: (chunk: StreamChunk) => void,
): Promise<StreamResult> {
  let content = ''
  const toolCallMap = new Map<
    string,
    { id: string; type: 'function'; function: { name: string; arguments: string } }
  >()

  for await (const chunk of gen) {
    if (onChunk) onChunk(chunk)
    switch (chunk.type) {
      case 'content':
        content += chunk.content ?? ''
        break
      case 'tool_calls':
        for (const tc of chunk.toolCalls ?? []) {
          const key = tc.id ?? `tc-${tc.index}`
          if (!toolCallMap.has(key)) {
            toolCallMap.set(key, {
              id: key,
              type: 'function',
              function: { name: '', arguments: '' },
            })
          }
          const entry = toolCallMap.get(key)!
          if (tc.id) entry.id = tc.id
          if (tc.function?.name) entry.function.name += tc.function.name
          if (tc.function?.arguments) entry.function.arguments += tc.function.arguments
        }
        break
      case 'error':
        throw new Error(chunk.error)
      case 'done':
        break
    }
  }

  return {
    content,
    toolCalls: Array.from(toolCallMap.values()),
  }
}
