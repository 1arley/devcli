import { describe, it, expect } from 'vitest'
import { fastHelp } from '../packages/cli/src/fast-help'

describe('fast-help', () => {
  it('includes usage line', () => {
    expect(fastHelp()).toContain('Usage: dev [options] [command]')
  })

  it('lists global options', () => {
    const help = fastHelp()
    expect(help).toContain('-V, --version')
    expect(help).toContain('-h, --help')
  })

  it('lists core commands', () => {
    const help = fastHelp()
    for (const cmd of ['doctor', 'docker', 'git', 'json', 'uuid', 'qr', 'completion']) {
      expect(help).toContain(cmd)
    }
  })

  it('mentions the repository', () => {
    expect(fastHelp()).toContain('github.com/1arley/devcli')
  })
})
