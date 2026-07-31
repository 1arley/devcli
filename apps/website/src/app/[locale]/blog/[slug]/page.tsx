import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const posts = {
  'introducing-devcli': {
    title: {
      en: 'Introducing DevCLI v1.0',
      'pt-BR': 'Apresentando DevCLI v1.0',
      es: 'Presentando DevCLI v1.0',
    },
    date: '2026-07-29',
    category: { en: 'Release', 'pt-BR': 'Lançamento', es: 'Lanzamiento' },
  },
  'plugin-architecture': {
    title: {
      en: 'Inside the Plugin Architecture',
      'pt-BR': 'Por Dentro da Arquitetura de Plugins',
      es: 'Dentro de la Arquitectura de Plugins',
    },
    date: '2026-07-25',
    category: { en: 'Architecture', 'pt-BR': 'Arquitetura', es: 'Arquitectura' },
  },
  'comparing-dev-tools': {
    title: {
      en: 'DevCLI vs Traditional CLI Workflows',
      'pt-BR': 'DevCLI vs Fluxos CLI Tradicionais',
      es: 'DevCLI vs Flujos CLI Tradicionales',
    },
    date: '2026-07-20',
    category: { en: 'Comparison', 'pt-BR': 'Comparação', es: 'Comparación' },
  },
} as const

function formatDate(isoDate: string, locale: Locale) {
  const localeMap = { en: 'en-US', 'pt-BR': 'pt-BR', es: 'es-ES' }
  return new Date(isoDate).toLocaleDateString(localeMap[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function generateStaticParams() {
  const locales = ['en', 'pt-BR', 'es']
  return locales.flatMap((locale) => Object.keys(posts).map((slug) => ({ locale, slug })))
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const dict = getDictionary(locale)
  const post = posts[slug as keyof typeof posts]

  if (!post) notFound()

  return (
    <div className="container mx-auto px-4 py-24">
      <article className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href={`/${locale}/blog`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {dict.blog.title}
          </Link>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Badge variant="secondary">{post.category[locale]}</Badge>
          <span className="text-sm text-muted-foreground">{formatDate(post.date, locale)}</span>
        </div>

        <h1 className="mb-8 text-4xl font-bold md:text-5xl">{post.title[locale]}</h1>

        <div className="prose prose-sm max-w-none text-muted-foreground">
          {slug === 'introducing-devcli' && <IntroducingDevCLIContent locale={locale} />}
          {slug === 'plugin-architecture' && <PluginArchitectureContent locale={locale} />}
          {slug === 'comparing-dev-tools' && <ComparingDevToolsContent locale={locale} />}
        </div>
      </article>
    </div>
  )
}

function IntroducingDevCLIContent({ locale }: { locale: Locale }) {
  const content: Record<Locale, React.ReactNode> = {
    en: (
      <>
        <p className="mb-4">
          DevCLI is a single CLI that bundles 11 developer tools — doctor, docker, ports, git, json,
          jwt, uuid, qr, env, repo, and ai — into one consistent experience. No more juggling five
          different commands with incompatible flags.
        </p>
        <p className="mb-4">
          The plugin architecture means each tool is self-contained but shares the same UI patterns,
          configuration system, and Ink-based TUI. You install once and get everything.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">What's Included</h2>
        <ul className="mb-4 space-y-1">
          <li>11 production-ready plugins</li>
          <li>Interactive TUI mode with fuzzy search</li>
          <li>Cross-platform (macOS, Linux, Windows)</li>
          <li>159 tests, MIT licensed, 100% open source</li>
        </ul>
        <h2 className="mb-3 text-xl font-bold text-foreground">Install</h2>
        <pre className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
          npm install -g @1arley/devcli
        </pre>
      </>
    ),
    'pt-BR': (
      <>
        <p className="mb-4">
          DevCLI é uma CLI única que agrupa 11 ferramentas de desenvolvimento — doctor, docker,
          ports, git, json, jwt, uuid, qr, env, repo e ai — em uma experiência consistente. Chega de
          lidar com cinco comandos diferentes com flags incompatíveis.
        </p>
        <p className="mb-4">
          A arquitetura de plugins significa que cada ferramenta é autossuficiente, mas compartilha
          os mesmos padrões de UI, sistema de configuração e TUI baseado em Ink. Você instala uma
          vez e tem tudo.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">O que está incluído</h2>
        <ul className="mb-4 space-y-1">
          <li>11 plugins prontos para produção</li>
          <li>Modo TUI interativo com busca fuzzy</li>
          <li>Multiplataforma (macOS, Linux, Windows)</li>
          <li>159 testes, licença MIT, 100% código aberto</li>
        </ul>
        <h2 className="mb-3 text-xl font-bold text-foreground">Instalar</h2>
        <pre className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
          npm install -g @1arley/devcli
        </pre>
      </>
    ),
    es: (
      <>
        <p className="mb-4">
          DevCLI es una CLI única que agrupa 11 herramientas de desarrollo — doctor, docker, ports,
          git, json, jwt, uuid, qr, env, repo y ai — en una experiencia consistente. Se acabó lidiar
          con cinco comandos diferentes con flags incompatibles.
        </p>
        <p className="mb-4">
          La arquitectura de plugins significa que cada herramienta es autónoma, pero comparte los
          mismos patrones de UI, sistema de configuración y TUI basado en Ink. Instalas una vez y
          tienes todo.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Lo que está incluido</h2>
        <ul className="mb-4 space-y-1">
          <li>11 plugins listos para producción</li>
          <li>Modo TUI interactivo con búsqueda fuzzy</li>
          <li>Multiplataforma (macOS, Linux, Windows)</li>
          <li>159 tests, licencia MIT, 100% código abierto</li>
        </ul>
        <h2 className="mb-3 text-xl font-bold text-foreground">Instalar</h2>
        <pre className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
          npm install -g @1arley/devcli
        </pre>
      </>
    ),
  }
  return content[locale]
}

function PluginArchitectureContent({ locale }: { locale: Locale }) {
  const content: Record<Locale, React.ReactNode> = {
    en: (
      <>
        <p className="mb-4">
          Every DevCLI plugin is a standalone{' '}
          <code className="rounded bg-muted px-1">@devcli/plugin-*</code> package. They register
          with the plugin registry and are auto-discovered by the CLI at startup.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">How Discovery Works</h2>
        <p className="mb-4">
          The CLI scans for packages matching the{' '}
          <code className="rounded bg-muted px-1">@devcli/plugin-*</code>
          pattern. Each plugin exports a registration function that declares its command name,
          flags, and handler.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Building Your Own</h2>
        <p className="mb-4">
          Create a package under <code className="rounded bg-muted px-1">packages/plugins/</code>,
          add the dependency and path mapping in the CLI package, register it, and add a test file.
          The full guide is in the contributing docs.
        </p>
      </>
    ),
    'pt-BR': (
      <>
        <p className="mb-4">
          Cada plugin do DevCLI é um pacote autossuficiente{' '}
          <code className="rounded bg-muted px-1">@devcli/plugin-*</code>. Eles se registram no
          registro de plugins e são auto-descobertos pela CLI na inicialização.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Como Funciona a Descoberta</h2>
        <p className="mb-4">
          A CLI procura pacotes que correspondam ao padrão{' '}
          <code className="rounded bg-muted px-1">@devcli/plugin-*</code>. Cada plugin exporta uma
          função de registro que declara o nome do comando, flags e handler.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Construindo o Seu</h2>
        <p className="mb-4">
          Crie um pacote em <code className="rounded bg-muted px-1">packages/plugins/</code>,
          adicione a dependência e o path mapping no pacote CLI, registre-o e adicione um arquivo de
          teste. O guia completo está na documentação de contribuição.
        </p>
      </>
    ),
    es: (
      <>
        <p className="mb-4">
          Cada plugin de DevCLI es un paquete autónomo{' '}
          <code className="rounded bg-muted px-1">@devcli/plugin-*</code>. Se registran en el
          registro de plugins y son auto-descubiertos por la CLI al iniciar.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Cómo Funciona el Descubrimiento</h2>
        <p className="mb-4">
          La CLI escanea paquetes que coincidan con el patrón{' '}
          <code className="rounded bg-muted px-1">@devcli/plugin-*</code>. Cada plugin exporta una
          función de registro que declara el nombre del comando, flags y handler.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Construyendo el Tuyo</h2>
        <p className="mb-4">
          Crea un paquete en <code className="rounded bg-muted px-1">packages/plugins/</code>, añade
          la dependencia y el path mapping en el paquete CLI, regístralo y añade un archivo de test.
          La guía completa está en la documentación de contribución.
        </p>
      </>
    ),
  }
  return content[locale]
}

function ComparingDevToolsContent({ locale }: { locale: Locale }) {
  const content: Record<Locale, React.ReactNode> = {
    en: (
      <>
        <p className="mb-4">
          Most developers use a mix of <code className="rounded bg-muted px-1">docker</code>,{' '}
          <code className="rounded bg-muted px-1">lsof</code>,{' '}
          <code className="rounded bg-muted px-1">jq</code>, and{' '}
          <code className="rounded bg-muted px-1">uuidgen</code> — each with different syntax,
          different platforms, different output formats.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">One CLI, One Syntax</h2>
        <p className="mb-4">
          DevCLI unifies these into a single interface. Every plugin uses the same flag patterns,
          same output formatting, same config system.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">The Numbers</h2>
        <ul className="mb-4 space-y-1">
          <li>5+ tools replaced by 1 CLI</li>
          <li>11 plugins, each replacing a separate tool or workflow</li>
          <li>Cross-platform: same commands on macOS, Linux, Windows</li>
        </ul>
      </>
    ),
    'pt-BR': (
      <>
        <p className="mb-4">
          A maioria dos desenvolvedores usa uma mistura de{' '}
          <code className="rounded bg-muted px-1">docker</code>,{' '}
          <code className="rounded bg-muted px-1">lsof</code>,{' '}
          <code className="rounded bg-muted px-1">jq</code>, e{' '}
          <code className="rounded bg-muted px-1">uuidgen</code> — cada um com sintaxe diferente,
          plataformas diferentes, formatos de saída diferentes.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Uma CLI, Uma Sintaxe</h2>
        <p className="mb-4">
          O DevCLI unifica tudo em uma única interface. Cada plugin usa os mesmos padrões de flags,
          mesma formatação de saída, mesmo sistema de configuração.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Os Números</h2>
        <ul className="mb-4 space-y-1">
          <li>5+ ferramentas substituídas por 1 CLI</li>
          <li>11 plugins, cada um substituindo uma ferramenta ou workflow separado</li>
          <li>Multiplataforma: mesmos comandos no macOS, Linux, Windows</li>
        </ul>
      </>
    ),
    es: (
      <>
        <p className="mb-4">
          La mayoría de desarrolladores usan una mezcla de{' '}
          <code className="rounded bg-muted px-1">docker</code>,{' '}
          <code className="rounded bg-muted px-1">lsof</code>,{' '}
          <code className="rounded bg-muted px-1">jq</code>, y{' '}
          <code className="rounded bg-muted px-1">uuidgen</code> — cada uno con sintaxis diferente,
          plataformas diferentes, formatos de salida diferentes.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Una CLI, Una Sintaxis</h2>
        <p className="mb-4">
          DevCLI unifica todo en una sola interfaz. Cada plugin usa los mismos patrones de flags,
          misma formatación de salida, mismo sistema de configuración.
        </p>
        <h2 className="mb-3 text-xl font-bold text-foreground">Los Números</h2>
        <ul className="mb-4 space-y-1">
          <li>5+ herramientas reemplazadas por 1 CLI</li>
          <li>11 plugins, cada uno reemplazando una herramienta o flujo separado</li>
          <li>Multiplataforma: mismos comandos en macOS, Linux, Windows</li>
        </ul>
      </>
    ),
  }
  return content[locale]
}
