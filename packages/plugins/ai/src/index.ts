import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { exec } from '@devcli/core'
import { symbols, withSpinner, createTable } from '@devcli/ui'
import chalk from 'chalk'
import { loadConfig, writeConfig } from '@devcli/config'
import * as readline from 'node:readline'
import { stdin as processStdin, stdout as processStdout } from 'node:process'
import { existsSync, chmodSync } from 'node:fs'
import { join } from 'node:path'

// Single shared readline interface across all prompts.
// Re-creating + closing per prompt breaks sequential hidden input on modern Node.
let _rl: readline.Interface | null = null
let rlClosed = false
function getRL(): readline.Interface {
  if (!_rl || rlClosed) {
    const rl = readline.createInterface({ input: processStdin, output: processStdout })
    _rl = rl
    rlClosed = false
    rl.on('close', () => {
      rlClosed = true
    })
  }
  return _rl
}

function closeRL(): void {
  if (_rl && !rlClosed) _rl.close()
  _rl = null
}

interface ProviderInfo {
  name: string
  baseUrl: string
  defaultModel: string
  models: string[]
  apiKeyLabel?: string
}

const PROVIDERS: ProviderInfo[] = [
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
const PROVIDER_MAP: ProviderMap = Object.fromEntries(PROVIDERS.map((p) => [p.name, p]))

function getProviderInfo(name: string): ProviderInfo {
  return (
    PROVIDER_MAP[name] ?? {
      name,
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o-mini',
      models: ['gpt-4o-mini'],
    }
  )
}

async function ask(question: string, hidden: boolean = false): Promise<string> {
  const rl = getRL()
  if (hidden) {
    processStdout.write(question)
    return new Promise((resolve) => {
      const buf: string[] = []
      const onData = (chunk: Buffer) => {
        const char = chunk.toString()
        if (char === '\r' || char === '\n') {
          processStdin.removeListener('data', onData)
          processStdout.write('\n')
          resolve(buf.join(''))
        } else if (char === '\x7f' || char === '\b') {
          if (buf.length) {
            buf.pop()
            processStdout.write('\b \b')
          }
        } else {
          buf.push(char)
          processStdout.write('*')
        }
      }
      processStdin.on('data', onData)
    })
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer))
  })
}

async function interactiveSetup(): Promise<void> {
  console.log(chalk.bold.cyan('\n╭─────────────────────────────╮'))
  console.log(chalk.bold.cyan('│  AI Provider Setup Wizard  │'))
  console.log(chalk.bold.cyan('╰─────────────────────────────╯\n'))

  const providerNames = PROVIDERS.map((p) => ({
    label: `${p.name}${p.apiKeyLabel ? ` (${p.apiKeyLabel})` : ''}`,
    value: p.name,
  }))
  providerNames.push({ label: 'custom (OpenAI-compatible)', value: '__custom__' })

  console.log('Select a provider:\n')
  providerNames.forEach((p, i) => {
    const num = String(i + 1).padStart(2)
    console.log(`  ${chalk.cyan(num)}. ${p.label}`)
  })
  console.log('')

  let providerName = ''
  while (!providerName) {
    const choice = (await ask(`  ${chalk.dim('Enter number')} `)).trim()
    const idx = parseInt(choice, 10) - 1
    if (idx >= 0 && idx < providerNames.length) {
      providerName = providerNames[idx]!.value
    } else {
      console.log(chalk.red('  Invalid choice'))
    }
  }

  let baseUrl = ''
  if (providerName === '__custom__') {
    providerName = 'custom'
    baseUrl = await ask(`  ${chalk.dim('Enter base URL')} `)
    if (!baseUrl.endsWith('/v1')) baseUrl = baseUrl.replace(/\/?$/, '/v1')
  }

  const info = PROVIDER_MAP[providerName] ?? getProviderInfo(providerName)
  const providerKey = providerName

  await writeConfig('ai.provider', providerKey)
  if (baseUrl) {
    const config = await readConfigRaw()
    const ai = (config.ai as Record<string, unknown>) ?? {}
    config.ai = { ...ai, provider: providerKey, baseUrl }
    await writeConfigRaw(config)
  }

  if (info.apiKeyLabel !== 'none (local)') {
    const apiKey = await ask(`  ${chalk.dim('Enter API key')} `, true)
    if (apiKey) await writeConfig('ai.apiKey', apiKey)
  } else {
    console.log(`  ${chalk.green('✓')} No API key needed for local model`)
  }

  console.log(chalk.bold(`\n  Models for ${providerKey}:\n`))
  info.models.forEach((m, i) => {
    console.log(`  ${chalk.cyan(String(i + 1).padStart(2))}. ${m}`)
  })
  console.log(`  ${chalk.cyan('  a')}. Use default (${info.defaultModel})`)
  console.log('')

  let model = info.defaultModel
  let modelChosen = false
  while (!modelChosen) {
    const modelChoice = (await ask(`  ${chalk.dim('Enter number or "a" for default')} `)).trim()
    if (modelChoice === 'a' || modelChoice === '') {
      model = info.defaultModel
      modelChosen = true
    } else {
      const modelIdx = parseInt(modelChoice, 10) - 1
      if (modelIdx >= 0 && modelIdx < info.models.length) {
        model = info.models[modelIdx]!
        modelChosen = true
      } else {
        console.log(chalk.red('  Invalid choice'))
      }
    }
  }
  await writeConfig('ai.model', model)

  console.log(
    `\n${chalk.green('✓')} AI configured: ${chalk.bold(providerKey)} / ${chalk.bold(model)}\n`,
  )
  console.log(`  ${chalk.dim('Test it: dev ai test')}`)
}

function configFilePath(): string {
  const home = process.env['HOME'] ?? ''
  const local = join(process.cwd(), '.devclirc.json')
  return existsSync(local) ? local : join(home, '.devclirc.json')
}

async function readConfigRaw(): Promise<Record<string, unknown>> {
  const { readFile } = await import('node:fs/promises')
  const home = process.env['HOME'] ?? ''
  const paths = [join(process.cwd(), '.devclirc.json'), join(home, '.devclirc.json')]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return JSON.parse(await readFile(p, 'utf-8')) as Record<string, unknown>
      } catch {
        /* skip */
      }
    }
  }
  return {}
}

async function writeConfigRaw(config: Record<string, unknown>): Promise<void> {
  const { writeFile } = await import('node:fs/promises')
  const path = configFilePath()
  await writeFile(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
  try {
    chmodSync(path, 0o600)
  } catch {
    /* best effort */
  }
}

async function aiFetch(
  messages: { role: string; content: string }[],
  system?: string,
): Promise<string | null> {
  const config = await loadConfig()
  const provider = config.ai?.provider ?? 'openai'
  const apiKey = config.ai?.apiKey
  const info = getProviderInfo(provider)
  const model = config.ai?.model ?? info.defaultModel
  const baseUrl = config.ai?.baseUrl ?? info.baseUrl

  if (!apiKey && provider !== 'ollama') return null

  try {
    let url = `${baseUrl}/chat/completions`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (provider === 'gemini') {
      url = `${baseUrl}/models/${model}:generateContent`
      headers['x-goog-api-key'] = apiKey!
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        }),
      })
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    }

    if (provider === 'anthropic') {
      url = `${baseUrl}/messages`
      headers['x-api-key'] = apiKey!
      headers['anthropic-version'] = '2023-06-01'
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, max_tokens: 1000, system, messages }),
      })
      const data = (await response.json()) as { content?: { text?: string }[] }
      return data.content?.[0]?.text ?? null
    }

    headers['Authorization'] = `Bearer ${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
        max_tokens: 1000,
      }),
    })
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

async function explainError(input: string): Promise<string> {
  const config = await loadConfig()
  const provider = config.ai?.provider
  const apiKey = config.ai?.apiKey

  if (!provider || !apiKey) return generateLocalExplanation(input)

  const result = await aiFetch(
    [{ role: 'user', content: `Explain this error/output and suggest a fix:\n\n${input}` }],
    'You are a senior developer assistant. Explain errors concisely and suggest fixes. Respond in markdown.',
  )
  return result ?? generateLocalExplanation(input)
}

function generateLocalExplanation(input: string): string {
  const lines = input.split('\n').filter(Boolean)
  const analysis: string[] = []
  analysis.push(chalk.bold.cyan('Analysis'))
  const errorLines = lines.filter(
    (l) =>
      l.toLowerCase().includes('error') ||
      l.toLowerCase().includes('exception') ||
      l.toLowerCase().includes('failed') ||
      l.toLowerCase().includes('cannot') ||
      l.toLowerCase().includes('undefined'),
  )
  if (errorLines.length > 0) {
    analysis.push(chalk.yellow('\nLikely issue:'))
    errorLines.slice(0, 3).forEach((l) => analysis.push(`  ${chalk.gray('→')} ${l.trim()}`))
  }
  const errorType = inferErrorType(input)
  if (errorType) analysis.push(chalk.yellow(`\nType: ${errorType}`))
  const suggestions = generateSuggestions(input, errorType)
  if (suggestions.length > 0) {
    analysis.push(chalk.green('\nSuggested fixes:'))
    suggestions.forEach((s) => analysis.push(`  ${chalk.green('✓')} ${s}`))
  }
  analysis.push(chalk.gray('\nFor AI-powered explanations, run: dev ai setup'))
  return analysis.join('\n')
}

function inferErrorType(input: string): string | null {
  const lower = input.toLowerCase()
  if (lower.includes('cannot read prop') || lower.includes('is not a function')) return 'TypeError'
  if (lower.includes('is not defined')) return 'ReferenceError'
  if (lower.includes('syntaxerror') || lower.includes('unexpected token')) return 'SyntaxError'
  if (lower.includes('econnrefused')) return 'NetworkError'
  if (lower.includes('enoent') || lower.includes('no such file')) return 'FileSystemError'
  if (lower.includes('timeout') || lower.includes('etimedout')) return 'TimeoutError'
  if (lower.includes('eacces') || lower.includes('permission denied')) return 'PermissionError'
  if (lower.includes('cannot find module')) return 'ModuleNotFoundError'
  if (lower.includes('port') && lower.includes('in use')) return 'PortInUseError'
  return null
}

function generateSuggestions(input: string, errorType: string | null): string[] {
  const suggestions: string[] = []
  const lower = input.toLowerCase()
  switch (errorType) {
    case 'TypeError':
      suggestions.push(
        'Check if the variable is null or undefined before accessing properties',
        'Add optional chaining (?.) or null checks',
      )
      break
    case 'ReferenceError':
      suggestions.push(
        'Ensure the variable is declared before use',
        'Check for typos in variable names',
      )
      break
    case 'SyntaxError':
      suggestions.push(
        'Check for missing brackets, parentheses, or commas',
        'Run a linter (eslint) to find syntax issues',
      )
      break
    case 'NetworkError':
      suggestions.push('Check if the service is running', 'Verify the port and host are correct')
      break
    case 'ModuleNotFoundError':
      suggestions.push(
        'Run pnpm install or npm install',
        'Check if the module is listed in package.json',
      )
      break
    case 'PortInUseError':
      suggestions.push('Run dev ports kill <port> to free the port')
      break
    case 'PermissionError':
      suggestions.push(
        'Check file permissions with ls -la',
        'Try chmod or run with appropriate privileges',
      )
      break
  }
  if (lower.includes('docker')) suggestions.push('Check if Docker daemon is running: docker info')
  if (lower.includes('npm') && lower.includes('err'))
    suggestions.push('Try removing node_modules and lock file, then reinstall')
  if (lower.includes('git')) suggestions.push('Check if you are in a git repository: git status')
  return suggestions
}

function git(args: string): string {
  return exec('git', args.split(/\s+/), { encoding: 'utf-8' })
}

function gitCommit(subject: string, body: string): string {
  const flag = body ? ['-m', subject, '-m', body] : ['-m', subject]
  return exec('git', ['commit', ...flag], { encoding: 'utf-8' })
}

function isRepo(): boolean {
  return git('rev-parse --is-inside-work-tree') === 'true'
}

const manifest = {
  name: 'ai',
  description: 'AI-powered developer tools: explain, commit, review, chat',
  version: '0.0.0',
  keywords: ['ai', 'explain', 'commit', 'review', 'chat', 'provider', 'setup'],
  category: 'ai' as const,
}

export const createAiPlugin: PluginFactory = (): Plugin => ({
  manifest,
  register(program: Command) {
    const ai = program.command('ai').description(manifest.description)

    ai.command('setup')
      .description('Interactive AI provider setup wizard')
      .action(async () => {
        try {
          await interactiveSetup()
        } finally {
          closeRL()
        }
      })

    ai.command('set')
      .description('Quick AI configuration')
      .argument('<prop>', 'Property to set: provider, key, model')
      .argument('[value]', 'Value')
      .argument('[extra]', 'Extra value (e.g. API key when setting provider)')
      .action(async (prop: string, value?: string, extra?: string) => {
        if (prop === 'provider') {
          if (!value) {
            console.log(chalk.yellow('Usage: dev ai set provider <name> [api-key]'))
            console.log(`Available: ${PROVIDERS.map((p) => p.name).join(', ')}`)
            return
          }
          const info = PROVIDER_MAP[value]
          if (!info) {
            console.log(`${symbols.error} Unknown provider: ${value}`)
            return
          }
          await writeConfig('ai.provider', value)
          console.log(`${symbols.success} Provider: ${chalk.bold(value)}`)
          if (extra) {
            await writeConfig('ai.apiKey', extra)
            console.log(`${symbols.success} API key set`)
          } else if (info.apiKeyLabel !== 'none (local)') {
            console.log(`${symbols.info} Set API key: ${chalk.cyan('dev ai set key <key>')}`)
          }
          console.log(`${symbols.info} Model: ${chalk.cyan(`dev ai set model <model>`)}`)
          return
        }
        if (prop === 'key') {
          if (!value) {
            console.log(chalk.yellow('Usage: dev ai set key <api-key>'))
            return
          }
          await writeConfig('ai.apiKey', value)
          console.log(`${symbols.success} API key saved`)
          return
        }
        if (prop === 'model') {
          if (!value) {
            console.log(chalk.yellow('Usage: dev ai set model <model-name>'))
            return
          }
          await writeConfig('ai.model', value)
          console.log(`${symbols.success} Model: ${chalk.bold(value)}`)
          return
        }
        console.log(`${symbols.error} Unknown property: ${prop}. Use: provider, key, model`)
      })

    ai.command('provider')
      .description('List or select AI provider')
      .argument('[name]', 'Provider name')
      .action(async (name?: string) => {
        if (!name) {
          const config = await loadConfig()
          const current = config.ai?.provider
          console.log(chalk.bold('\nAvailable providers:\n'))
          const rows = PROVIDERS.map((p) => ({
            Name: p.name === current ? chalk.green(`${p.name} ✓`) : p.name,
            'Default Model': p.defaultModel,
            'API Key': p.apiKeyLabel ?? 'required',
          }))
          const table = createTable(['Name', 'Default Model', 'API Key'], rows)
          console.log(table.toString())
          console.log(`\n${chalk.dim('Pick: dev ai setup')}`)
          console.log(`${chalk.dim('Quick: dev ai set provider openai sk-...')}`)
          return
        }
        const info = PROVIDER_MAP[name]
        if (!info) {
          console.log(
            `${symbols.error} Unknown provider. Options: ${PROVIDERS.map((p) => p.name).join(', ')}`,
          )
          return
        }
        await writeConfig('ai.provider', name)
        console.log(`${symbols.success} Provider: ${chalk.bold(name)}`)
        console.log(`${symbols.info} Set API key: ${chalk.cyan('dev ai set key <key>')}`)
      })

    ai.command('model')
      .description('Set or list AI models')
      .argument('[name]', 'Model name')
      .action(async (name?: string) => {
        const config = await loadConfig()
        const provider = config.ai?.provider ?? 'openai'
        const info = getProviderInfo(provider)
        if (!name) {
          const current = config.ai?.model ?? info.defaultModel
          console.log(chalk.bold(`\nModels for ${provider}:\n`))
          info.models.forEach((m) => console.log(`  ${m === current ? chalk.green(`${m} ✓`) : m}`))
          console.log(`\n${chalk.dim('Set: dev ai set model <name>')}`)
          return
        }
        await writeConfig('ai.model', name)
        console.log(`${symbols.success} Model: ${chalk.bold(name)}`)
      })

    ai.command('key')
      .description('Set API key for the current provider')
      .argument('[key]', 'API key')
      .action(async (key?: string) => {
        if (!key) {
          console.log(chalk.yellow('Usage: dev ai key <api-key>'))
          return
        }
        await writeConfig('ai.apiKey', key)
        console.log(`${symbols.success} API key saved`)
      })

    ai.command('config')
      .description('Show current AI configuration')
      .action(async () => {
        const config = await loadConfig()
        const aiConfig = config.ai
        if (!aiConfig?.provider) {
          console.log(chalk.gray('\nNo AI provider configured'))
          console.log(chalk.cyan('  dev ai setup'))
          return
        }
        const info = getProviderInfo(aiConfig.provider)
        const table = createTable(
          ['Setting', 'Value'],
          [
            { Setting: 'Provider', Value: chalk.bold(aiConfig.provider) },
            { Setting: 'Model', Value: chalk.bold(aiConfig.model ?? info.defaultModel) },
            {
              Setting: 'API Key',
              Value: aiConfig.apiKey ? chalk.green('✓ Set') : chalk.red('✗ Missing'),
            },
            { Setting: 'Endpoint', Value: chalk.dim(aiConfig.baseUrl ?? info.baseUrl) },
          ],
        )
        console.log(table.toString())
      })

    ai.command('test')
      .description('Test AI provider connection')
      .action(async () => {
        const config = await loadConfig()
        if (!config.ai?.apiKey && config.ai?.provider !== 'ollama') {
          console.log(`${symbols.error} No API key configured. Run: ${chalk.cyan('dev ai setup')}`)
          return
        }
        const result = await withSpinner(`Testing ${config.ai?.provider ?? 'openai'}...`, () =>
          aiFetch(
            [{ role: 'user', content: 'Reply with exactly: OK' }],
            'You are a test assistant. Reply with exactly one word.',
          ),
        )
        if (result) {
          console.log(`${symbols.success} Connected — ${chalk.bold(config.ai?.provider)} responded`)
        } else {
          console.log(`${symbols.error} Connection failed — check API key and provider`)
        }
      })

    ai.argument('[input...]', 'Error text or stack trace').action(async (input: string[]) => {
      let text = input.join(' ').trim()
      if (!text && !processStdin.isTTY) {
        text = await new Promise<string>((resolve) => {
          let data = ''
          processStdin.setEncoding('utf-8')
          processStdin.on('data', (chunk) => (data += chunk))
          processStdin.on('end', () => resolve(data.trim()))
        })
      }
      if (!text) {
        console.log(`${symbols.error} Provide an error message or pipe input`)
        console.log(chalk.gray('Usage: dev ai "TypeError: Cannot read property..."'))
        console.log(chalk.gray('Or pipe: cat error.log | dev ai'))
        console.log(chalk.gray('Or configure AI: dev ai setup'))
        return
      }
      const explanation = await withSpinner('Analyzing...', () => explainError(text))
      console.log(explanation)
    })

    ai.command('commit')
      .description('Generate a conventional commit message from staged changes')
      .option('-e, --execute', 'Auto-execute the commit without confirmation')
      .action(async (options: { execute?: boolean }) => {
        if (!isRepo()) {
          console.log(`${symbols.error} Not a Git repository`)
          return
        }
        const diff = git('diff --cached')
        if (!diff) {
          console.log(`${symbols.info} No staged changes. Run ${chalk.cyan('git add')} first.`)
          return
        }

        const config = await loadConfig()
        if (!config.ai?.apiKey) {
          console.log(`${symbols.error} AI not configured. Run: ${chalk.cyan('dev ai setup')}`)
          return
        }

        const msg = await withSpinner('Generating commit message...', () =>
          aiFetch(
            [
              {
                role: 'user',
                content: `Generate a conventional commit message for this diff:\n\n${diff.slice(0, 4000)}`,
              },
            ],
            'You generate conventional commit messages (feat:, fix:, chore:, docs:, refactor:, test:, perf:). Return ONLY the commit message, one line subject, then blank line, then body if needed.',
          ),
        )

        if (!msg) {
          console.log(`${symbols.error} Failed to generate commit message`)
          return
        }

        const subject = msg.split('\n')[0]?.trim() ?? ''
        console.log(chalk.bold('\nProposed commit message:'))
        console.log(chalk.cyan(`\n${msg}\n`))

        if (options.execute) {
          const body = msg.slice(subject.length).trim()
          gitCommit(subject, body)
          console.log(`${symbols.success} Committed: ${subject}`)
        } else {
          console.log(`${symbols.info} To commit: ${chalk.cyan(`git commit -m "${subject}"`)}`)
          console.log(`  ${chalk.cyan('dev ai commit --execute')} to skip this prompt`)
        }
      })

    ai.command('poem')
      .description('Generate a poem from git commits')
      .argument('[range]', 'Time range for git log', 'yesterday')
      .action(async (range: string) => {
        if (!isRepo()) {
          console.log(`${symbols.error} Not a Git repository`)
          return
        }
        const log = exec('git', ['log', `--since=${range}`, '--format=%s', '--no-merges'])
        if (!log) {
          console.log(`${symbols.info} No commits since "${range}"`)
          return
        }

        const config = await loadConfig()
        if (!config.ai?.apiKey) {
          console.log(`${symbols.error} AI not configured. Run: ${chalk.cyan('dev ai setup')}`)
          return
        }

        const poem = await withSpinner(
          `Composing poem from ${log.split('\n').length} commits...`,
          () =>
            aiFetch(
              [
                {
                  role: 'user',
                  content: `Write a short, creative poem about these git commits:\n\n${log}`,
                },
              ],
              'You are a poet who writes short, fun poems about code. Max 12 lines. Be creative and witty.',
            ),
        )

        if (poem) {
          console.log(`\n${chalk.bold.cyan('📜 Code Poem')}\n`)
          console.log(poem)
        } else {
          console.log(`${symbols.error} Failed to generate poem`)
        }
      })
  },
})
