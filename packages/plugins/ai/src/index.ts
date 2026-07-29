import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@dev-cli/core'
import { symbols, withSpinner } from '@dev-cli/ui'
import chalk from 'chalk'
import { loadConfig } from '@dev-cli/config'

async function explainError(input: string): Promise<string> {
  const config = await loadConfig()

  const provider = config.ai?.provider
  const apiKey = config.ai?.apiKey

  if (!provider || !apiKey) {
    return generateLocalExplanation(input)
  }

  const model = config.ai?.model ?? 'gpt-4o-mini'

  try {
    const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a senior developer assistant. Explain errors concisely and suggest fixes. Respond in markdown.',
          },
          {
            role: 'user',
            content: `Explain this error/output and suggest a fix:\n\n${input}`,
          },
        ],
        max_tokens: 500,
      }),
    })
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    return data.choices?.[0]?.message?.content ?? generateLocalExplanation(input)
  } catch {
    return generateLocalExplanation(input)
  }
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
  if (errorType) {
    analysis.push(chalk.yellow(`\nType: ${errorType}`))
  }

  const suggestions = generateSuggestions(input, errorType)
  if (suggestions.length > 0) {
    analysis.push(chalk.green('\nSuggested fixes:'))
    suggestions.forEach((s) => analysis.push(`  ${chalk.green('✓')} ${s}`))
  }

  analysis.push(chalk.gray('\nFor AI-powered explanations, configure a provider in .devclirc.json'))
  analysis.push(chalk.gray('{"ai": {"provider": "openai", "apiKey": "sk-..."}}'))

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
      suggestions.push('Check if the variable is null or undefined before accessing properties')
      suggestions.push('Add optional chaining (?.) or null checks')
      break
    case 'ReferenceError':
      suggestions.push('Ensure the variable is declared before use')
      suggestions.push('Check for typos in variable names')
      break
    case 'SyntaxError':
      suggestions.push('Check for missing brackets, parentheses, or commas')
      suggestions.push('Run a linter (eslint) to find syntax issues')
      break
    case 'NetworkError':
      suggestions.push('Check if the service is running')
      suggestions.push('Verify the port and host are correct')
      break
    case 'ModuleNotFoundError':
      suggestions.push('Run [1mpnpm install[0m or [1mnpm install[0m')
      suggestions.push('Check if the module is listed in package.json')
      break
    case 'PortInUseError':
      suggestions.push('Run [1mdev ports kill <port>[0m to free the port')
      break
    case 'PermissionError':
      suggestions.push('Check file permissions with [1mls -la[0m')
      suggestions.push('Try [1mchmod[0m or run with appropriate privileges')
      break
  }

  if (lower.includes('docker')) {
    suggestions.push('Check if Docker daemon is running: [1mdocker info[0m')
  }
  if (lower.includes('npm') && lower.includes('err')) {
    suggestions.push('Try removing [1mnode_modules[0m and lock file, then reinstall')
  }
  if (lower.includes('git')) {
    suggestions.push('Check if you are in a git repository: [1mgit status[0m')
  }

  return suggestions
}

const manifest = {
  name: 'ai',
  description: 'Explain errors, stack traces, and logs using AI',
  version: '0.0.0',
  keywords: ['ai', 'explain', 'error', 'debug', 'stack', 'trace'],
  category: 'ai' as const,
}

export const createAiPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const ai = program.command('ai').description(manifest.description)

      ai.argument('[input...]', 'Error text or stack trace').action(async (input: string[]) => {
        const text = input.join(' ').trim()
        if (!text) {
          console.log(`${symbols.error} Provide an error message or pipe input`)
          console.log(chalk.gray('Usage: dev ai "TypeError: Cannot read property..."'))
          console.log(chalk.gray('Usage: cat error.log | dev ai'))
          return
        }
        const explanation = await withSpinner('Analyzing...', () => explainError(text))
        console.log(explanation)
      })

      ai.command('config')
        .description('Show current AI configuration')
        .action(async () => {
          const config = await loadConfig()
          const aiConfig = config.ai
          if (!aiConfig) {
            console.log(chalk.gray('No AI provider configured'))
            console.log(chalk.gray('Add to .devclirc.json:'))
            console.log(
              chalk.cyan(
                '{\n  "ai": {\n    "provider": "openai",\n    "apiKey": "sk-...",\n    "model": "gpt-4o-mini"\n  }\n}',
              ),
            )
            return
          }
          console.log(`Provider: ${chalk.bold(aiConfig.provider ?? 'N/A')}`)
          console.log(`Model: ${chalk.bold(aiConfig.model ?? 'default')}`)
          console.log(`API Key: ${aiConfig.apiKey ? chalk.green('✓ Set') : chalk.red('✗ Missing')}`)
        })
    },
  }
}
