import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'
import { Card, CardContent } from '@/components/ui/card'
import { GITHUB_REPO_URL } from '@/lib/urls'

export default async function ContributingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  const labels: Record<
    Locale,
    { setup: string; workflow: string; commands: string; steps: string[] }
  > = {
    en: {
      setup: 'Setup',
      workflow: 'Workflow',
      commands: 'Commands',
      steps: [
        '1. Create a branch (feature/, fix/, docs/, refactor/)',
        '2. Implement your changes',
        '3. Add tests if applicable',
        '4. Run lint, typecheck, and tests',
        '5. Open a Pull Request',
      ],
    },
    'pt-BR': {
      setup: 'Configuração',
      workflow: 'Fluxo',
      commands: 'Comandos',
      steps: [
        '1. Crie uma branch (feature/, fix/, docs/, refactor/)',
        '2. Implemente suas mudanças',
        '3. Adicione testes se aplicável',
        '4. Rode lint, typecheck e testes',
        '5. Abra um Pull Request',
      ],
    },
    es: {
      setup: 'Configuración',
      workflow: 'Flujo',
      commands: 'Comandos',
      steps: [
        '1. Crea una rama (feature/, fix/, docs/, refactor/)',
        '2. Implementa tus cambios',
        '3. Añade tests si aplica',
        '4. Ejecuta lint, typecheck y tests',
        '5. Abre un Pull Request',
      ],
    },
  }

  const t = labels[locale]

  return (
    <div className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-4xl font-bold md:text-5xl">{dict.contributing.title}</h1>
        <p className="mb-12 text-lg text-muted-foreground">{dict.contributing.description}</p>

        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-2xl font-bold">{t.setup}</h2>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
                <div>git clone {GITHUB_REPO_URL}.git</div>
                <div>cd devcli</div>
                <div>pnpm install</div>
                <div>pnpm dev</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-2xl font-bold">{t.workflow}</h2>
              <ul className="space-y-2 text-muted-foreground">
                {t.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-2xl font-bold">{t.commands}</h2>
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
