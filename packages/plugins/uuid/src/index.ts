import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@dev-cli/core'
import { randomBytes, randomUUID } from 'node:crypto'

function uuidV4(): string {
  return randomUUID()
}

function uuidV7(): string {
  const timestamp = Date.now()
  const ts = BigInt(timestamp)
  const tsHi = Number(ts >> 16n)
  const tsLo = Number(ts & 0xffffn)
  const rand = randomBytes(10)
  const b = Buffer.alloc(16)
  b.writeUInt32BE(tsHi, 0)
  b.writeUInt16BE(tsLo, 4)
  rand.copy(b, 6)
  b[6] = (b[6]! & 0x0f) | 0x70
  b[8] = (b[8]! & 0x3f) | 0x80
  const hex = b.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function nanoId(size: number = 21): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  const bytes = randomBytes(size)
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join('')
}

function ulid(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  const time = Date.now()
  let result = ''
  let t = BigInt(time)
  for (let i = 9; i >= 0; i--) {
    const mod = Number(t % 32n)
    result = alphabet[mod]! + result
    t = t >> 5n
  }
  const random = randomBytes(16)
  let randomPart = ''
  for (let i = 0; i < 16; i++) {
    randomPart += alphabet[random[i]! % 32]
  }
  return result + randomPart
}

const manifest = {
  name: 'uuid',
  description: 'Generate UUID v4, v7, NanoID, and ULID',
  version: '0.0.0',
  keywords: ['uuid', 'v4', 'v7', 'nanoid', 'ulid', 'id', 'generate'],
  category: 'utility' as const,
}

export const createUuidPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const uuid = program.command('uuid').description(manifest.description)

      uuid.action(() => {
        console.log(uuidV4())
      })

      uuid
        .command('v4')
        .description('Generate a UUID v4')
        .option('-n, --count <n>', 'Number of UUIDs to generate', '1')
        .action((options: { count: string }) => {
          const count = parseInt(options.count, 10)
          for (let i = 0; i < count; i++) console.log(uuidV4())
        })

      uuid
        .command('v7')
        .description('Generate a UUID v7 (time-ordered)')
        .option('-n, --count <n>', 'Number of UUIDs to generate', '1')
        .action((options: { count: string }) => {
          const count = parseInt(options.count, 10)
          for (let i = 0; i < count; i++) console.log(uuidV7())
        })

      uuid
        .command('nano')
        .description('Generate a NanoID')
        .option('-s, --size <n>', 'Size of the ID', '21')
        .option('-n, --count <n>', 'Number of IDs to generate', '1')
        .action((options: { size: string; count: string }) => {
          const size = parseInt(options.size, 10)
          const count = parseInt(options.count, 10)
          for (let i = 0; i < count; i++) console.log(nanoId(size))
        })

      uuid
        .command('ulid')
        .description('Generate a ULID')
        .option('-n, --count <n>', 'Number of ULIDs to generate', '1')
        .action((options: { count: string }) => {
          const count = parseInt(options.count, 10)
          for (let i = 0; i < count; i++) console.log(ulid())
        })
    },
  }
}
