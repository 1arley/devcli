import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { GITHUB_REPO_URL } from '@/lib/urls'
import { Card, CardContent } from '@/components/ui/card'

export default async function ShowcasePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  const ctaText: Record<Locale, string> = {
    en: 'Share your project',
    'pt-BR': 'Compartilhe seu projeto',
    es: 'Comparte tu proyecto',
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.showcase.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.showcase.description}</p>

        <div className="space-y-12">
          <div>
            <h2 className="mb-4 text-2xl font-bold">{dict.showcase.projects}</h2>
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <p className="mb-4 text-muted-foreground">{dict.showcase.noProjects}</p>
                  <a
                    href={`${GITHUB_REPO_URL}/issues/new?labels=showcase&title=Showcase:+My+Project`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {ctaText[locale]}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold">{dict.showcase.companies}</h2>
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">{dict.showcase.noCompanies}</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold">{dict.showcase.contributors}</h2>
            <Card>
              <CardContent className="py-8">
                <p className="mb-4 text-muted-foreground">{dict.showcase.joinDescription}</p>
                <a
                  href={`${GITHUB_REPO_URL}/graphs/contributors`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {dict.showcase.joinCommunity} →
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
