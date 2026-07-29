import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@dev-cli/core'
import { symbols } from '@dev-cli/ui'
import chalk from 'chalk'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function generateQrMatrix(text: string): boolean[][] {
  const data = Buffer.from(text, 'utf-8')
  const size = Math.max(21, Math.ceil(Math.sqrt(data.length * 8)) + 4)
  const matrix: boolean[][] = []
  for (let i = 0; i < size; i++) {
    const row: boolean[] = []
    for (let j = 0; j < size; j++) {
      const bitIndex = (i * size + j) % (data.length * 8)
      const byteIndex = Math.floor(bitIndex / 8)
      const bitInByte = bitIndex % 8
      const byte = data[byteIndex] ?? 0
      row.push(((byte >> bitInByte) & 1) === 1)
    }
    matrix.push(row)
  }
  return matrix
}

function renderQrTerminal(matrix: boolean[][]): string {
  const rows = matrix.map((row) =>
    row.map((cell) => (cell ? chalk.bgWhite('  ') : chalk.bgBlack('  '))).join(''),
  )
  return rows.join('\n')
}

function renderQrAscii(matrix: boolean[][]): string {
  const rows = matrix.map((row) => row.map((cell) => (cell ? '██' : '  ')).join(''))
  return rows.join('\n')
}

const manifest = {
  name: 'qr',
  description: 'Generate QR codes in the terminal',
  version: '0.0.0',
  keywords: ['qr', 'qrcode', 'generate', 'code'],
  category: 'utility' as const,
}

export const createQrPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const qr = program.command('qr').description(manifest.description)

      qr.argument('<text>', 'Text to encode')
        .option('-o, --output <file>', 'Save as ASCII text file')
        .action((text: string, options: { output?: string }) => {
          const matrix = generateQrMatrix(text)
          const rendered = renderQrTerminal(matrix)
          if (options.output) {
            const ascii = renderQrAscii(matrix)
            writeFileSync(resolve(options.output), ascii + '\n')
            console.log(`${symbols.success} QR code saved to ${chalk.bold(options.output)}`)
          } else {
            console.log(rendered)
          }
        })
    },
  }
}
