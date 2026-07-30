import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function ChangelogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  const releases = [
    {
      version: '1.0.4',
      date: 'July 29, 2026',
      changes: ['11 plugins', 'Plugin architecture', 'Ink TUI', '159 tests'],
    },
  ]

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.changelog.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.changelog.description}</p>

        <div className="space-y-6">
          {releases.map((release, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono">v{release.version}</CardTitle>
                  <Badge variant="secondary">{release.date}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="default" className="text-xs">
                        {dict.changelog.added}
                      </Badge>
                      {change}
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
