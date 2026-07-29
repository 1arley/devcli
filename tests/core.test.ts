import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { PluginRegistry } from '../packages/core/src/registry'
import { loadPlugins } from '../packages/core/src/loader'
import type { Plugin, PluginFactory } from '../packages/core/src/types'

function makeFactory(name: string): PluginFactory {
  return (): Plugin => ({
    manifest: {
      name,
      description: `${name} plugin`,
      version: '0.0.0',
      keywords: [name],
      category: 'utility',
    },
    register(program) {
      program
        .command(name)
        .description(`${name} cmd`)
        .action(() => {})
    },
  })
}

describe('PluginRegistry', () => {
  let reg: PluginRegistry
  beforeEach(() => (reg = new PluginRegistry()))
  afterEach(() => reg.clear())

  it('register stores plugin accessible via get', () => {
    reg.register('a', makeFactory('a'))
    expect(reg.get('a')).toBeDefined()
    expect(reg.get('a')?.manifest.name).toBe('a')
  })

  it('has returns boolean for presence', () => {
    expect(reg.has('x')).toBe(false)
    reg.register('x', makeFactory('x'))
    expect(reg.has('x')).toBe(true)
  })

  it('get returns undefined for missing plugin', () => {
    expect(reg.get('nope')).toBeUndefined()
  })

  it('all returns every registered plugin in insertion order', () => {
    reg.register('a', makeFactory('a'))
    reg.register('b', makeFactory('b'))
    const all = reg.all()
    expect(all).toHaveLength(2)
    expect(all.map((p) => p.manifest.name)).toEqual(['a', 'b'])
  })

  it('all returns shallow copy (mutation does not affect registry)', () => {
    reg.register('a', makeFactory('a'))
    const all = reg.all()
    all.length = 0
    expect(reg.all()).toHaveLength(1)
  })

  it('manifests extracts only manifest objects', () => {
    reg.register('a', makeFactory('a'))
    reg.register('b', makeFactory('b'))
    const m = reg.manifests()
    expect(m).toHaveLength(2)
    expect(m[0]?.name).toBe('a')
  })

  it('getFactory returns stored factory', () => {
    const f = makeFactory('a')
    reg.register('a', f)
    expect(reg.getFactory('a')).toBe(f)
  })

  it('getFactory returns undefined for unknown name', () => {
    expect(reg.getFactory('missing')).toBeUndefined()
  })

  it('clear empties plugins and factories', () => {
    reg.register('a', makeFactory('a'))
    reg.clear()
    expect(reg.all()).toHaveLength(0)
    expect(reg.has('a')).toBe(false)
    expect(reg.getFactory('a')).toBeUndefined()
  })

  it('re-register overwrites previous plugin', () => {
    reg.register('a', makeFactory('a'))
    reg.register('a', makeFactory('a-v2'))
    expect(reg.all()).toHaveLength(1)
    expect(reg.get('a')?.manifest.version).toBe('0.0.0')
  })
})

describe('loadPlugins', () => {
  it('registers all plugin commands on the program', () => {
    const reg = new PluginRegistry()
    reg.register('a', makeFactory('a'))
    reg.register('b', makeFactory('b'))
    const program = new Command()
    loadPlugins(reg, program)
    const names = program.commands.map((c) => c.name())
    expect(names).toContain('a')
    expect(names).toContain('b')
  })

  it('logs error when a plugin fails to register but continues', () => {
    const reg = new PluginRegistry()
    const bad: PluginFactory = () => ({
      manifest: { name: 'bad', description: '', version: '0', keywords: [], category: 'dev' },
      register: () => {
        throw new Error('boom')
      },
    })
    reg.register('good', makeFactory('good'))
    reg.register('bad', bad)
    const program = new Command()
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    loadPlugins(reg, program)
    expect(errSpy).toHaveBeenCalled()
    expect(program.commands.map((c) => c.name())).toContain('good')
    errSpy.mockRestore()
  })

  it('no-op on empty registry', () => {
    const reg = new PluginRegistry()
    const program = new Command()
    loadPlugins(reg, program)
    expect(program.commands).toHaveLength(0)
  })
})
