import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { notFound } from 'next/navigation'
import Link from 'next/link'

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

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>
}) {
  const { locale, slug } = await params
  const dict = getDictionary(locale)

  const section = slugToSection[slug]
  if (!section) notFound()

  const content = dict.docs[section]

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
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{content.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{content.description}</p>
      </div>
    </div>
  )
}
