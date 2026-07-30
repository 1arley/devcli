import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DocsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  const sections = [
    {
      title: dict.docs.gettingStarted.title,
      description: dict.docs.gettingStarted.description,
      href: 'getting-started',
    },
    {
      title: dict.docs.commands.title,
      description: dict.docs.commands.description,
      href: 'commands',
    },
    { title: dict.docs.plugins.title, description: dict.docs.plugins.description, href: 'plugins' },
    {
      title: dict.docs.configuration.title,
      description: dict.docs.configuration.description,
      href: 'configuration',
    },
    {
      title: dict.docs.architecture.title,
      description: dict.docs.architecture.description,
      href: 'architecture',
    },
    {
      title: dict.docs.contributing.title,
      description: dict.docs.contributing.description,
      href: 'contributing',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.docs.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.docs.description}</p>

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section, index) => (
            <Link key={index} href={`/${locale}/docs/${section.href}`}>
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{section.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
