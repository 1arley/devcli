import { execSync } from 'node:child_process'
import { mkdirSync, copyFileSync, rmSync, existsSync, readFileSync, chmodSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliDir = join(__dirname, '..')
const packageJson = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf-8'))
const version = packageJson.version

const PLATFORMS = [
  { name: 'linux-x64', os: 'linux', arch: 'x64' },
  { name: 'linux-arm64', os: 'linux', arch: 'arm64' },
  { name: 'darwin-x64', os: 'darwin', arch: 'x64' },
  { name: 'darwin-arm64', os: 'darwin', arch: 'arm64' },
  { name: 'win32-x64', os: 'win32', arch: 'x64' },
  { name: 'win32-arm64', os: 'win32', arch: 'arm64' },
]

const FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

function run(cmd, cwd) {
  console.log(`  $ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', shell: true, cwd })
}

function main() {
  const target = process.env.SEA_PLATFORM
  const platformConfig = PLATFORMS.find((p) => p.name === target)
  if (!platformConfig) {
    console.error(
      `Unknown SEA_PLATFORM: ${target}. Expected one of: ${PLATFORMS.map((p) => p.name).join(', ')}`,
    )
    process.exit(1)
  }

  console.log(`Building SEA executable for devcli v${version} (${platformConfig.name})`)

  const distDir = join(cliDir, 'dist-sea')
  const releasesDir = join(cliDir, 'releases')
  mkdirSync(releasesDir, { recursive: true })

  const blob = join(distDir, 'sea-prep.blob')
  const targetBin = join(distDir, `dev-${platformConfig.name}`)
  const isWin = platformConfig.os === 'win32'
  const outputName = `devcli-${version}-${platformConfig.name}${isWin ? '.exe' : ''}`
  const output = join(releasesDir, outputName)

  if (!existsSync(blob)) {
    console.log('Step 1: Building single-file ESM bundle...')
    run('pnpm exec tsup --config tsup.sea.config.ts', cliDir)

    console.log('Step 2: Generating SEA blob...')
    run('node --experimental-sea-config sea-config.json', cliDir)
  }

  if (!existsSync(blob)) {
    console.error(`SEA blob not found: ${blob}`)
    process.exit(1)
  }

  console.log('Step 3: Copying Node binary...')
  const nodeBin = process.execPath
  copyFileSync(nodeBin, targetBin)
  if (!isWin) {
    chmodSync(targetBin, 0o755)
  }

  console.log('Step 4: Injecting blob with postject...')
  const fuseArg = `--sentinel-fuse ${FUSE}`
  const machoArg = platformConfig.os === 'darwin' ? '--macho-segment-name NODE_SEA' : ''
  run(`pnpm exec postject ${targetBin} NODE_SEA_BLOB ${blob} ${fuseArg} ${machoArg}`, cliDir)

  if (existsSync(output)) rmSync(output)
  copyFileSync(targetBin, output)
  if (!isWin) {
    chmodSync(output, 0o755)
  }
  rmSync(targetBin)

  console.log(`Created: ${output}`)
}

main()