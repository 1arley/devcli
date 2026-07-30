import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n'

interface ComparisonsProps {
  dict: Dictionary
}

export function Comparisons({ dict }: ComparisonsProps) {
  const comparisons = [
    {
      title: dict.comparisons.docker.before,
      after: dict.comparisons.docker.after,
      before: ['docker ps', 'docker ps -a', 'docker images', 'docker volume ls'],
    },
    {
      title: dict.comparisons.ports.before,
      after: dict.comparisons.ports.after,
      before: ['lsof -i :3000', 'kill -9 12345', 'netstat -an | grep 3000'],
    },
    {
      title: dict.comparisons.doctor.before,
      after: dict.comparisons.doctor.after,
      before: ['node --version', 'npm --version', 'git --version', 'docker --version'],
    },
  ]

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">{dict.comparisons.title}</h2>
        <p className="text-lg text-muted-foreground">{dict.comparisons.description}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {comparisons.map((comparison, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-base">{comparison.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">{comparison.title}</p>
                <div className="rounded-lg bg-destructive/10 p-3 font-mono text-sm text-destructive">
                  {comparison.before.map((cmd, i) => (
                    <div key={i}>$ {cmd}</div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-primary">{comparison.after}</p>
                <div className="rounded-lg bg-primary/10 p-3 font-mono text-sm text-primary">
                  $ dev
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
