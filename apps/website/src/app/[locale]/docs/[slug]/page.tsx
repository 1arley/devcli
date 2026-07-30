import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

type DocSection =
  'gettingStarted' | 'commands' | 'plugins' | 'configuration' | 'architecture' | 'contributing'

const slugToSection: Record<string, DocSection> = {
  'getting-started': 'gettingStarted',
  commands: 'commands',
  plugins: 'plugins',
  configuration: 'configuration',
  architecture: 'architecture',
  contributing: 'contributing',
}

export function generateStaticParams() {
  const locales = ['en', 'pt-BR', 'es']
  return locales.flatMap((locale) => Object.keys(slugToSection).map((slug) => ({ locale, slug })))
}

const plugins = [
  { name: 'doctor', desc: 'Environment diagnostics — Node, npm, Git, Docker health checks' },
  { name: 'docker', desc: 'Inspect containers, images, volumes, and networks' },
  { name: 'ports', desc: 'List and kill ports instantly. Cross-platform' },
  { name: 'git', desc: 'Branch overview, status, log, and stash management' },
  { name: 'json', desc: 'Format, minify, validate, and convert JSON/YAML' },
  { name: 'jwt', desc: 'Decode, encode, and validate JWT tokens' },
  { name: 'uuid', desc: 'Generate UUIDs, NanoIDs, and ULIDs' },
  { name: 'qr', desc: 'Generate QR codes in the terminal' },
  { name: 'env', desc: 'Compare .env files and find missing variables' },
  { name: 'repo', desc: 'Analyze project structure, framework, and dependencies' },
  { name: 'ai', desc: 'Explain errors with local heuristics or OpenAI integration' },
]

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
      <pre className="whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

function GettingStartedContent() {
  return (
    <>
      <h2 className="mb-4 mt-12 text-2xl font-bold">Installation</h2>
      <p className="mb-4 text-muted-foreground">
        Install DevCLI globally via npm. Requires Node.js 18+.
      </p>
      <CodeBlock>npm install -g @1arley/devcli</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Verify Installation</h2>
      <p className="mb-4 text-muted-foreground">
        Run the doctor plugin to verify everything works:
      </p>
      <CodeBlock>dev doctor</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">First Steps</h2>
      <p className="mb-4 text-muted-foreground">
        DevCLI groups tools into plugins. Each plugin is a self-contained command:
      </p>
      <CodeBlock>{`dev doctor    # check your environment
dev docker   # inspect containers and images
dev ports    # list and kill ports
dev git      # branch overview and status
dev json     # format and validate JSON
dev jwt      # decode and verify tokens`}</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Getting Help</h2>
      <p className="mb-4 text-muted-foreground">
        Each plugin supports <code className="rounded bg-muted px-1">--help</code> for usage
        details.
      </p>
      <CodeBlock>{`dev --help       # list all plugins
dev doctor --help  # plugin-specific flags`}</CodeBlock>
    </>
  )
}

function CommandsContent() {
  return (
    <>
      <p className="mb-8 text-lg text-muted-foreground">
        DevCLI ships with 11 plugins. Each plugin is invoked as{' '}
        <code className="rounded bg-muted px-1">dev {'<plugin>'}</code>.
      </p>

      {plugins.map((p) => (
        <Card key={p.name} className="mb-6">
          <CardContent className="pt-6">
            <h3 className="mb-2 font-mono text-xl font-bold">dev {p.name}</h3>
            <p className="text-muted-foreground">{p.desc}</p>
            <p className="mt-2">
              <Link href={`/commands/${p.name}`} className="text-sm text-primary hover:underline">
                View examples →
              </Link>
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function PluginsContent() {
  return (
    <>
      <h2 className="mb-4 mt-8 text-2xl font-bold">Official Plugins</h2>
      <p className="mb-6 text-muted-foreground">
        11 production-ready plugins bundled with the CLI.
      </p>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {plugins.map((p) => (
          <Card key={p.name}>
            <CardContent className="pt-6">
              <h3 className="mb-1 font-mono font-bold">dev {p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Plugin Architecture</h2>
      <p className="mb-4 text-muted-foreground">
        Each plugin is a standalone <code className="rounded bg-muted px-1">@devcli/plugin-*</code>{' '}
        package. They register with the plugin registry and are auto-discovered by the CLI.
      </p>
      <CodeBlock>{`packages/plugins/
├── ai/
├── docker/
├── doctor/
├── git/
├── json/
├── jwt/
├── ports/
├── qr/
├── repo/
└── uuid/`}</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Planned Plugins</h2>
      <p className="mb-4 text-muted-foreground">
        On the roadmap: kubernetes, redis, postgres, next.js, react, nestjs, prisma.
      </p>
    </>
  )
}

function ConfigurationContent() {
  return (
    <>
      <h2 className="mb-4 mt-8 text-2xl font-bold">Config File</h2>
      <p className="mb-4 text-muted-foreground">
        DevCLI reads <code className="rounded bg-muted px-1">.devclirc.json</code> from the current
        directory or home directory.
      </p>
      <CodeBlock>{`{
  "version": 1,
  "defaults": {
    "editor": "code",
    "shell": "bash",
    "theme": "default"
  },
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o"
  },
  "docker": {
    "socket": "/var/run/docker.sock"
  },
  "ports": {
    "ignore": [3000, 5432]
  }
}`}</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Options</h2>
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-1 font-bold">defaults.editor</h3>
            <p className="text-sm text-muted-foreground">
              Editor to open files with. Default:{' '}
              <code className="rounded bg-muted px-1">code</code>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-1 font-bold">defaults.shell</h3>
            <p className="text-sm text-muted-foreground">
              Shell for commands. Default: <code className="rounded bg-muted px-1">bash</code>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-1 font-bold">defaults.theme</h3>
            <p className="text-sm text-muted-foreground">
              UI theme. Options: <code className="rounded bg-muted px-1">default</code>,{' '}
              <code className="rounded bg-muted px-1">dark</code>,{' '}
              <code className="rounded bg-muted px-1">light</code>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-1 font-bold">ai</h3>
            <p className="text-sm text-muted-foreground">
              AI provider config for the <code className="rounded bg-muted px-1">dev ai</code>{' '}
              plugin. Supports openai, anthropic, or ollama.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-1 font-bold">docker.socket</h3>
            <p className="text-sm text-muted-foreground">Custom Docker socket path.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-1 font-bold">ports.ignore</h3>
            <p className="text-sm text-muted-foreground">Ports to exclude from listing/killing.</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function ArchitectureContent() {
  return (
    <>
      <h2 className="mb-4 mt-8 text-2xl font-bold">Monorepo Layout</h2>
      <CodeBlock>{`devcli/
├── apps/
│   ├── website/     # Next.js docs site
│   └── docs/        # Documentation app
├── packages/
│   ├── config/    # @devcli/config — config loading
│   ├── core/      # @devcli/core — plugin system, registry
│   ├── ui/        # @devcli/ui — Ink-based UI components
│   ├── cli/       # @1arley/devcli — published CLI
│   └── plugins/   # 11 plugins, each @devcli/plugin-*
├── tests/         # Vitest tests (flat)
└── scripts/       # publish.mjs`}</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Bundling Strategy</h2>
      <p className="mb-4 text-muted-foreground">
        tsup with esbuild. Base packages emit <code className="rounded bg-muted px-1">.d.ts</code> +
        ESM. CLI bundles all <code className="rounded bg-muted px-1">@devcli/*</code> deps into a
        single ESM file via <code className="rounded bg-muted px-1">noExternal</code>. React, Ink,
        and Commander stay as externals.
      </p>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Dependency Graph</h2>
      <CodeBlock>{`config, ui               # leaf packages
    └── core             # depends on config + ui
        └── plugins      # each depends on core + ui
            └── cli      # depends on core + config + ui + all plugins`}</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">TypeScript Resolution</h2>
      <p className="mb-4 text-muted-foreground">
        Build uses pnpm workspace symlinks. Typecheck needs{' '}
        <code className="rounded bg-muted px-1">dist/</code> from upstream deps. CLI typecheck
        path-maps each plugin to source — works without plugin dist. Tests alias{' '}
        <code className="rounded bg-muted px-1">@devcli/core</code>/
        <code className="rounded bg-muted px-1">config</code> to src,{' '}
        <code className="rounded bg-muted px-1">@devcli/ui</code> to test stub.
      </p>
    </>
  )
}

function ContributingContent() {
  return (
    <>
      <h2 className="mb-4 mt-8 text-2xl font-bold">Setup</h2>
      <CodeBlock>{`git clone https://github.com/1arley/devcli.git
cd devcli
pnpm install`}</CodeBlock>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Development Workflow</h2>
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 font-bold">1. Create a branch</h3>
            <p className="text-sm text-muted-foreground">
              Prefix: <code className="rounded bg-muted px-1">feature/</code>,{' '}
              <code className="rounded bg-muted px-1">fix/</code>,{' '}
              <code className="rounded bg-muted px-1">docs/</code>,{' '}
              <code className="rounded bg-muted px-1">refactor/</code>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 font-bold">2. Build base deps</h3>
            <CodeBlock>
              pnpm --filter @devcli/config --filter @devcli/ui --filter @devcli/core run build
            </CodeBlock>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 font-bold">3. Verify</h3>
            <CodeBlock>{`pnpm lint
pnpm typecheck
pnpm build
pnpm test:run`}</CodeBlock>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 font-bold">4. Commit & Push</h3>
            <p className="text-sm text-muted-foreground">
              Pre-commit hook runs lint-staged (eslint + prettier). If it fails on apps/ files,
              stage only your files.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-bold">Adding a Plugin</h2>
      <ol className="space-y-3 text-muted-foreground">
        <li>
          1. Create <code className="rounded bg-muted px-1">packages/plugins/{'<name>'}/</code> with
          package.json, tsconfig, tsup config, and src/
        </li>
        <li>
          2. Add dependency in{' '}
          <code className="rounded bg-muted px-1">packages/cli/package.json</code>
        </li>
        <li>
          3. Add path mapping in{' '}
          <code className="rounded bg-muted px-1">packages/cli/tsconfig.json</code>
        </li>
        <li>
          4. Add to <code className="rounded bg-muted px-1">noExternal</code> in{' '}
          <code className="rounded bg-muted px-1">packages/cli/tsup.config.ts</code>
        </li>
        <li>
          5. Register plugin in{' '}
          <code className="rounded bg-muted px-1">packages/cli/src/registry.ts</code>
        </li>
        <li>
          6. Add test file{' '}
          <code className="rounded bg-muted px-1">tests/plugin-{'{name}'}.test.ts</code>
        </li>
      </ol>
    </>
  )
}

const contentMap: Record<
  DocSection,
  (props: { dict: ReturnType<typeof getDictionary>; locale: Locale }) => React.ReactNode
> = {
  gettingStarted: () => <GettingStartedContent />,
  commands: () => <CommandsContent />,
  plugins: () => <PluginsContent />,
  configuration: () => <ConfigurationContent />,
  architecture: () => <ArchitectureContent />,
  contributing: () => <ContributingContent />,
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const dict = getDictionary(locale)

  const section = slugToSection[slug]
  if (!section) notFound()

  const meta = dict.docs[section]
  const Content = contentMap[section]

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href={`/${locale}/docs`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {dict.docs.title}
          </Link>
        </div>
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{meta.title}</h1>
        <Content dict={dict} locale={locale} />
      </div>
    </div>
  )
}
