import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Dictionary } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/config'

interface CTAProps {
  dict: Dictionary
  locale: Locale
}

export function CTA({ dict, locale }: CTAProps) {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
        <h2 className="mb-4 text-3xl font-bold md:text-4xl">{dict.cta.title}</h2>
        <p className="mb-8 text-lg text-muted-foreground">{dict.cta.description}</p>
        <Button size="lg" asChild>
          <Link href={`/${locale}/docs/getting-started`}>{dict.cta.getStarted}</Link>
        </Button>
      </div>
    </section>
  )
}
