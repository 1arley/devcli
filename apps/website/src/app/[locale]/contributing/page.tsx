import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent } from '@/components/ui/card'

export default async function ContributingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.contributing.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.contributing.description}</p>

        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-2xl font-bold">Setup</h2>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
                <div>git clone https://github.com/1arley/devcli.git</div>
                <div>cd devcli</div>
                <div>pnpm install</div>
                <div>pnpm dev</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-2xl font-bold">Workflow</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>1. Create a branch (feature/, fix/, docs/, refactor/)</li>
                <li>2. Implement your changes</li>
                <li>3. Add tests if applicable</li>
                <li>4. Run lint, typecheck, and tests</li>
                <li>5. Open a Pull Request</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-2xl font-bold">Commands</h2>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
                <div>pnpm lint</div>
                <div>pnpm typecheck</div>
                <div>pnpm test</div>
                <div>pnpm build</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
