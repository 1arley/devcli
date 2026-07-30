import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { symbols, infoBox } from '@devcli/ui'
import chalk from 'chalk'

function base64UrlDecode(str: string): string {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').replace(/=*$/, '') + pad
  return Buffer.from(b64, 'base64').toString('utf-8')
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url')
}

function decodeToken(
  token: string,
): { header: unknown; payload: unknown; signature: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const header = JSON.parse(base64UrlDecode(parts[0] ?? ''))
    const payload = JSON.parse(base64UrlDecode(parts[1] ?? ''))
    const signature = parts[2] ?? ''
    return { header, payload, signature }
  } catch {
    return null
  }
}

function encodeToken(payload: Record<string, unknown>, header?: Record<string, unknown>): string {
  const hdr = header ?? { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(JSON.stringify(hdr))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = base64UrlEncode('dev-cli-unsigned')
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

function validateToken(token: string): { valid: boolean; expired: boolean; reason?: string } {
  const decoded = decodeToken(token)
  if (!decoded) {
    return { valid: false, expired: false, reason: 'Malformed token' }
  }
  const payload = decoded.payload as Record<string, unknown> | null
  if (!payload) {
    return { valid: false, expired: false, reason: 'Invalid payload' }
  }
  const exp = payload['exp']
  if (exp !== undefined && typeof exp === 'number') {
    const now = Math.floor(Date.now() / 1000)
    if (exp < now) {
      return {
        valid: true,
        expired: true,
        reason: `Expired at ${new Date(exp * 1000).toISOString()}`,
      }
    }
  }
  const iat = payload['iat']
  if (iat !== undefined && typeof iat === 'number') {
    const now = Math.floor(Date.now() / 1000)
    if (iat > now) {
      return { valid: false, expired: false, reason: 'Token issued in the future' }
    }
  }
  return { valid: true, expired: false }
}

const manifest = {
  name: 'jwt',
  description: 'Decode, encode, and validate JWT tokens',
  version: '0.0.0',
  keywords: ['jwt', 'token', 'auth', 'decode', 'encode'],
  category: 'security' as const,
}

export const createJwtPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const jwt = program.command('jwt').description(manifest.description)

      jwt
        .command('decode <token>')
        .description('Decode a JWT token')
        .action((token: string) => {
          const decoded = decodeToken(token)
          if (!decoded) {
            console.log(`${symbols.error} Invalid JWT token`)
            return
          }
          console.log(infoBox('Header', JSON.stringify(decoded.header, null, 2)))
          console.log(infoBox('Payload', JSON.stringify(decoded.payload, null, 2)))
          console.log(`  ${chalk.bold('Signature')} ${decoded.signature}`)
        })

      jwt
        .command('encode')
        .description('Encode a JWT token from JSON payload')
        .option('-p, --payload <json>', 'JSON payload')
        .option('-h, --header <json>', 'JSON header (optional)')
        .action((options: { payload?: string; header?: string }) => {
          if (!options.payload) {
            console.log(`${symbols.error} Provide payload via --payload '{"sub":"123"}'`)
            return
          }
          try {
            const payload = JSON.parse(options.payload)
            const header = options.header ? JSON.parse(options.header) : undefined
            const token = encodeToken(payload, header)
            console.log(token)
          } catch (e) {
            console.log(`${symbols.error} Invalid JSON: ${(e as Error).message}`)
          }
        })

      jwt
        .command('validate <token>')
        .description('Validate a JWT token structure and expiration')
        .action((token: string) => {
          const result = validateToken(token)
          const icon = result.valid && !result.expired ? symbols.success : symbols.error
          let msg = `${icon} Valid: ${result.valid}, Expired: ${result.expired}`
          if (result.reason) msg += ` (${result.reason})`
          console.log(msg)
        })
    },
  }
}
