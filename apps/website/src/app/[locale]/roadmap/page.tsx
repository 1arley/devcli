import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function RoadmapPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  const roadmap = [
    {
      version: 'v1.0.0',
      status: dict.roadmap.completed,
      items: ['11 plugins', 'Plugin architecture', 'Ink TUI', '159 tests'],
    },
    {
      version: 'v1.1.0',
      status: dict.roadmap.planned,
      items: ['dev ssh', 'dev logs', 'Plugin auto-discovery'],
    },
    {
      version: 'v1.2.0',
      status: dict.roadmap.planned,
      items: ['dev kubernetes', 'dev redis', 'dev postgres'],
    },
    {
      version: 'v1.3.0',
      status: dict.roadmap.planned,
      items: ['dev next', 'dev react', 'dev nestjs', 'dev prisma'],
    },
    {
      version: 'v2.0.0',
      status: dict.roadmap.future,
      items: ['Cloud providers', 'Plugin marketplace', 'Theme system'],
    },
  ]

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.roadmap.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.roadmap.description}</p>

        <div className="space-y-6">
          {roadmap.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono">{item.version}</CardTitle>
                  <Badge variant={item.status === dict.roadmap.completed ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {item.items.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feat}
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
