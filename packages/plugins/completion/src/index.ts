import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { symbols } from '@devcli/ui'
import chalk from 'chalk'
import { execSync } from 'node:child_process'

function getCommands(): string[] {
  try {
    const help = execSync('node packages/cli/dist/index.js --help 2>/dev/null', {
      encoding: 'utf-8',
    })
    const lines = help.split('\n')
    const commands: string[] = []
    let inCommands = false
    for (const line of lines) {
      if (line.includes('Commands:')) {
        inCommands = true
        continue
      }
      if (inCommands && line.trim() && !line.includes('Options:')) {
        const match = line.trim().match(/^(\S+)/)
        if (match && match[1] && !match[1].startsWith('-')) commands.push(match[1])
      }
    }
    return commands
  } catch {
    return []
  }
}

function generateZsh(commands: string[]): string {
  return `#compdef dev
_dev_commands() {
  local -a commands
  commands=(
    ${commands.map((c) => `"${c}:${c} command"`).join('\n    ')}
  )
  _describe 'command' commands
}

_dev() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  _arguments \\
    '(-V --version)'{-V,--version}'[output version number]' \\
    '(-h --help)'{-h,--help}'[display help information]' \\
    '*::command:->command'

  case $state in
    command)
      _dev_commands
      ;;
  esac
}

compdef _dev dev
`
}

function generateBash(commands: string[]): string {
  return `_dev_completions() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  opts="${commands.join(' ')} --help --version"

  if [[ \${COMP_CWORD} -eq 1 ]] ; then
    COMPREPLY=($(compgen -W "\${opts}" -- \${cur}))
    return 0
  fi

  case "\${prev}" in
    *)
      COMPREPLY=($(compgen -W "\${opts}" -- \${cur}))
      ;;
  esac
}

complete -F _dev_completions dev
`
}

const manifest = {
  name: 'completion',
  description: 'Generate shell completion scripts for bash and zsh',
  version: '0.0.0',
  keywords: ['completion', 'shell', 'zsh', 'bash', 'autocomplete'],
  category: 'utility' as const,
}

export const createCompletionPlugin: PluginFactory = (): Plugin => ({
  manifest,
  register(program: Command) {
    program
      .command('completion')
      .description(manifest.description)
      .argument('[shell]', 'Shell type (zsh, bash)', 'zsh')
      .action((shell: string) => {
        const commands = getCommands()
        if (commands.length === 0) {
          console.log(`${symbols.error} Could not detect commands`)
          return
        }

        if (shell === 'zsh') {
          console.log(generateZsh(commands))
          console.log(`\n${chalk.dim('# Install: source <(dev completion zsh)')}`)
          console.log(`${chalk.dim('# Or: dev completion zsh > ~/.oh-my-zsh/completions/_dev')}`)
        } else if (shell === 'bash') {
          console.log(generateBash(commands))
          console.log(`\n${chalk.dim('# Install: source <(dev completion bash)')}`)
          console.log(`${chalk.dim('# Or: dev completion bash >> ~/.bashrc')}`)
        } else {
          console.log(`${symbols.error} Unsupported shell: ${shell}. Use zsh or bash.`)
        }
      })
  },
})
