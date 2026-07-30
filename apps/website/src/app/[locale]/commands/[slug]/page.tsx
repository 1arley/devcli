import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { pluginDemos } from '@/lib/fixtures'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const locales = ['en', 'pt-BR', 'es']
  return locales.flatMap((locale) =>
    pluginDemos.map((plugin) => ({
      locale,
      slug: plugin.plugin,
    })),
  )
}

export default async function CommandPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const dict = getDictionary(locale)

  const plugin = pluginDemos.find((p) => p.plugin === slug)
  if (!plugin) notFound()
  void dict

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <h1 className="text-4xl font-bold font-mono md:text-5xl">dev {plugin.plugin}</h1>
            <Badge variant="secondary">{plugin.category}</Badge>
          </div>
          <p className="text-lg text-muted-foreground">{plugin.description}</p>
        </div>

        <div className="space-y-8">
          {plugin.fixtures.map((fixture, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{fixture.title}</CardTitle>
                <CardDescription>{fixture.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3 font-mono text-sm">
                  <span className="text-primary">$</span>
                  <code>{fixture.command}</code>
                </div>
                <div className="rounded-lg bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">
                    {fixture.output}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
