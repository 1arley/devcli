import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'

export default async function ShowcasePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.showcase.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.showcase.description}</p>

        <div className="space-y-12">
          <div>
            <h2 className="mb-4 text-2xl font-bold">{dict.showcase.projects}</h2>
            <p className="text-muted-foreground">{dict.showcase.noProjects}</p>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold">{dict.showcase.companies}</h2>
            <p className="text-muted-foreground">{dict.showcase.noCompanies}</p>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold">{dict.showcase.contributors}</h2>
            <p className="text-muted-foreground">{dict.showcase.joinDescription}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
