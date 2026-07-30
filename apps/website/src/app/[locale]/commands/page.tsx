import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { pluginDemos } from '@/lib/fixtures'

export default async function CommandsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.commands.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.commands.description}</p>

        <div className="grid gap-6 md:grid-cols-2">
          {pluginDemos.map((plugin) => (
            <Link key={plugin.plugin} href={`/${locale}/commands/${plugin.plugin}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono">dev {plugin.plugin}</CardTitle>
                    <Badge variant="secondary">{plugin.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{plugin.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
