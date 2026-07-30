import Link from 'next/link'
import { Terminal, Star, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InteractiveTerminal } from '@/components/landing/InteractiveTerminal'
import type { Dictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/config'

interface HeroProps {
  dict: Dictionary
  locale: Locale
}

export function Hero({ dict, locale }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/0" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6">
            {dict.hero.badge}
          </Badge>

          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">{dict.hero.title}</h1>

          <p className="mb-4 text-xl text-muted-foreground md:text-2xl">{dict.hero.subtitle}</p>

          <p className="mb-8 text-lg text-muted-foreground">{dict.hero.description}</p>

          <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={`/${locale}/docs/getting-started`}>{dict.hero.getStarted}</Link>
            </Button>

            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/1arley/devcli"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                {dict.nav.github}
              </a>
            </Button>
          </div>

          <div className="mb-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>{dict.hero.plugins}</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span>{dict.hero.mitLicense}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>{dict.hero.openSource}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm">
            <code>{dict.hero.install}</code>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <InteractiveTerminal dict={dict} />
        </div>
      </div>
    </section>
  )
}
