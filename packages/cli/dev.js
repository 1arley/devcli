#!/usr/bin/env node

const args = process.argv.slice(2)

if (
  args.length <= 1 &&
  (args[0] === '--help' || args[0] === '-h' || args[0] === '--version' || args[0] === '-V')
) {
  await import('./dist/fast-help.js')
} else {
  await import('./dist/index.js')
}
