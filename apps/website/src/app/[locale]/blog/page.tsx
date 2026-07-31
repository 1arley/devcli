import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

const posts = [
  {
    slug: 'introducing-devcli',
    title: {
      en: 'Introducing DevCLI v1.0',
      'pt-BR': 'Apresentando DevCLI v1.0',
      es: 'Presentando DevCLI v1.0',
    },
    excerpt: {
      en: 'The first stable release of DevCLI — 11 plugins, a plugin architecture, and a streamlined developer experience.',
      'pt-BR':
        'A primeira versão estável do DevCLI — 11 plugins, arquitetura de plugins e uma experiência de desenvolvimento simplificada.',
      es: 'La primera versión estable de DevCLI — 11 plugins, arquitectura de plugins y una experiencia de desarrollo simplificada.',
    },
    date: '2026-07-29',
    category: { en: 'Release', 'pt-BR': 'Lançamento', es: 'Lanzamiento' },
  },
  {
    slug: 'plugin-architecture',
    title: {
      en: 'Inside the Plugin Architecture',
      'pt-BR': 'Por Dentro da Arquitetura de Plugins',
      es: 'Dentro de la Arquitectura de Plugins',
    },
    excerpt: {
      en: 'How DevCLI discovers, loads, and isolates plugins — and how to build your own.',
      'pt-BR': 'Como o DevCLI descobre, carrega e isola plugins — e como construir o seu.',
      es: 'Cómo DevCLI descubre, carga y aísla plugins — y cómo construir el tuyo.',
    },
    date: '2026-07-25',
    category: { en: 'Architecture', 'pt-BR': 'Arquitetura', es: 'Arquitectura' },
  },
  {
    slug: 'comparing-dev-tools',
    title: {
      en: 'DevCLI vs Traditional CLI Workflows',
      'pt-BR': 'DevCLI vs Fluxos CLI Tradicionais',
      es: 'DevCLI vs Flujos CLI Tradicionales',
    },
    excerpt: {
      en: 'Stop memorizing flags. See how DevCLI replaces 5+ tools with a single cohesive CLI.',
      'pt-BR':
        'Pare de memorizar flags. Veja como o DevCLI substitui 5+ ferramentas com uma única CLI coesa.',
      es: 'Deja de memorizar flags. Mira cómo DevCLI reemplaza 5+ herramientas con una sola CLI cohesiva.',
    },
    date: '2026-07-20',
    category: { en: 'Comparison', 'pt-BR': 'Comparação', es: 'Comparación' },
  },
] as const

function formatDate(isoDate: string, locale: Locale) {
  const localeMap = { en: 'en-US', 'pt-BR': 'pt-BR', es: 'es-ES' }
  return new Date(isoDate).toLocaleDateString(localeMap[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function BlogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.blog.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.blog.description}</p>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/${locale}/blog/${post.slug}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{post.category[locale]}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(post.date, locale)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="mb-2">{post.title[locale]}</CardTitle>
                  <CardDescription className="text-base">{post.excerpt[locale]}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
