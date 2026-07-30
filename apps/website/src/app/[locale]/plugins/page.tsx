import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { pluginDemos } from '@/lib/fixtures'

export default async function PluginsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.plugins.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.plugins.description}</p>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">{dict.plugins.official}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {pluginDemos.map((plugin) => (
              <Card key={plugin.plugin}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono">{plugin.plugin}</CardTitle>
                    <Badge variant="default">{dict.plugins.official}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{plugin.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">{dict.plugins.experimental}</h2>
          <p className="text-muted-foreground">{dict.plugins.noExperimental}</p>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-bold">{dict.plugins.planned}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {['kubernetes', 'redis', 'postgres', 'next', 'react', 'nestjs', 'prisma'].map(
              (plugin) => (
                <Card key={plugin}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-mono">{plugin}</CardTitle>
                      <Badge variant="outline">{dict.plugins.comingSoon}</Badge>
                    </div>
                  </CardHeader>
                </Card>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
