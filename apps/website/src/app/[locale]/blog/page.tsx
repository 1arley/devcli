import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function BlogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.blog.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.blog.description}</p>

        <Card>
          <CardHeader>
            <CardTitle>{dict.blog.introducing}</CardTitle>
            <CardDescription className="text-base">
              {dict.blog.introducingDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">July 29, 2026</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
