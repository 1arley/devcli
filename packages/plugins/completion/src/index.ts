import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { exec } from '@devcli/core'
import { symbols } from '@devcli/ui'
import chalk from 'chalk'

function getCommands(): string[] {
  const bin = process.argv[1] ?? 'dev'
  const help = exec('node', [bin, '--help'])
  if (!help) return []
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

function generateFish(commands: string[]): string {
  const completions = commands
    .map((c) => `complete -c dev -n '__fish_use_subcommand' -a ${c} -d '${c} command'`)
    .join('\n')
  return `# fish completion for dev
${completions}
complete -c dev -l help -d 'Display help information'
complete -c dev -l version -d 'Display version number'
`
}

const INSTALL_HINTS: Record<string, string[]> = {
  bash: [
    'source <(dev completion bash)',
    'dev completion bash >> ~/.bashrc',
    'dev completion bash > /etc/bash_completion.d/dev',
  ],
  zsh: [
    'source <(dev completion zsh)',
    'dev completion zsh > ~/.oh-my-zsh/completions/_dev',
    'dev completion zsh > ~/.zsh/completions/_dev',
  ],
  fish: [
    'dev completion fish > ~/.config/fish/completions/dev.fish',
    'source ~/.config/fish/completions/dev.fish',
  ],
}

const manifest = {
  name: 'completion',
  description: 'Generate shell completion scripts for bash, zsh and fish',
  version: '0.0.0',
  keywords: ['completion', 'shell', 'zsh', 'bash', 'fish', 'autocomplete'],
  category: 'utility' as const,
}

function printInstallHints(shell: string) {
  const hints = INSTALL_HINTS[shell] ?? []
  if (hints.length === 0) return
  console.log(`\n${chalk.dim('# Install:')}`)
  for (const hint of hints) {
    console.log(`${chalk.dim('#   ' + hint)}`)
  }
}

export const createCompletionPlugin: PluginFactory = (): Plugin => ({
  manifest,
  register(program: Command) {
    program
      .command('completion')
      .description(manifest.description)
      .argument('[shell]', 'Shell type (bash, zsh, fish)', 'zsh')
      .action((shell: string) => {
        const commands = getCommands()
        if (commands.length === 0) {
          console.log(`${symbols.error} Could not detect commands`)
          return
        }

        if (shell === 'zsh') {
          console.log(generateZsh(commands))
          printInstallHints('zsh')
        } else if (shell === 'bash') {
          console.log(generateBash(commands))
          printInstallHints('bash')
        } else if (shell === 'fish') {
          console.log(generateFish(commands))
          printInstallHints('fish')
        } else {
          console.log(`${symbols.error} Unsupported shell: ${shell}. Use bash, zsh or fish.`)
        }
      })
  },
})
