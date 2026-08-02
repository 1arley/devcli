import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { symbols } from '@devcli/ui'
import chalk from 'chalk'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import QRCode from 'qrcode'

const manifest = {
  name: 'qr',
  description: 'Generate scannable QR codes in the terminal',
  version: '0.0.0',
  keywords: ['qr', 'qrcode', 'generate', 'code', 'scannable'],
  category: 'utility' as const,
}

export const createQrPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const qr = program.command('qr').description(manifest.description)

      qr.argument('<text>', 'Text to encode')
        .option('-o, --output <file>', 'Save as ASCII text file')
        .action(async (text: string, options: { output?: string }) => {
          try {
            const opts = { type: 'terminal', small: false, errorCorrectionLevel: 'M' } as const
            const terminal = await QRCode.toString(text, opts)
            if (options.output) {
              /* eslint-disable no-control-regex */
              const ascii = terminal
                .replace(/\u001b\[[0-9;]*m/g, '')
                .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
              /* eslint-enable no-control-regex */
              writeFileSync(resolve(options.output), ascii + '\n')
              console.log(`${symbols.success} QR code saved to ${chalk.bold(options.output)}`)
            } else {
              console.log(terminal)
            }
          } catch (err) {
            console.log(`${symbols.error} Failed to generate QR: ${(err as Error).message}`)
          }
        })
    },
  }
}
