import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GITHUB_REPO_URL } from '@/lib/urls'

type ChangeType = 'added' | 'fixed' | 'changed' | 'removed'

interface Release {
  version: string
  date: string
  changes: { type: ChangeType; description: string }[]
}

const releases: Release[] = [
  {
    version: '1.0.4',
    date: '2026-07-29',
    changes: [
      { type: 'added', description: '11 plugins' },
      { type: 'added', description: 'Plugin architecture with auto-discovery' },
      { type: 'added', description: 'Ink-based TUI components' },
      { type: 'added', description: '159 tests' },
    ],
  },
  {
    version: '1.0.3',
    date: '2026-07-20',
    changes: [
      { type: 'added', description: 'repo plugin — project structure analysis' },
      { type: 'added', description: 'ai plugin — error explanation with heuristics' },
      { type: 'fixed', description: 'Cross-platform port detection on Windows' },
    ],
  },
  {
    version: '1.0.2',
    date: '2026-07-10',
    changes: [
      { type: 'added', description: 'qr plugin — QR code generation in terminal' },
      { type: 'added', description: 'env plugin — .env file comparison' },
      { type: 'changed', description: 'Plugin registry now validates schema on load' },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-06-28',
    changes: [
      { type: 'added', description: 'jwt plugin — decode, encode, validate tokens' },
      { type: 'added', description: 'uuid plugin — UUID, NanoID, ULID generation' },
      { type: 'fixed', description: 'Doctor plugin false positive on npm permissions' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-15',
    changes: [
      { type: 'added', description: 'Initial release' },
      { type: 'added', description: 'Core plugins: doctor, docker, ports, git, json' },
      { type: 'added', description: 'Configuration system with .devclirc.json' },
    ],
  },
]

function formatDate(isoDate: string, locale: Locale) {
  const localeMap = { en: 'en-US', 'pt-BR': 'pt-BR', es: 'es-ES' }
  return new Date(isoDate).toLocaleDateString(localeMap[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const badgeVariant: Record<ChangeType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  added: 'default',
  fixed: 'secondary',
  changed: 'outline',
  removed: 'destructive',
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.changelog.title}</h1>
        <p className="mb-4 text-lg text-muted-foreground">{dict.changelog.description}</p>
        <p className="mb-12">
          <a
            href={`${GITHUB_REPO_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {locale === 'en'
              ? 'View all releases on GitHub →'
              : locale === 'pt-BR'
                ? 'Ver todos os releases no GitHub →'
                : 'Ver todos los releases en GitHub →'}
          </a>
        </p>

        <div className="space-y-6">
          {releases.map((release) => (
            <Card key={release.version}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-xl font-bold">v{release.version}</h2>
                  <Badge variant="secondary">{formatDate(release.date, locale)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant={badgeVariant[change.type]} className="text-xs">
                        {dict.changelog[change.type]}
                      </Badge>
                      {change.description}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
