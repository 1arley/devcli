import { Download, Star, GitFork, Users } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n'

interface StatsProps {
  dict: Dictionary
}

export function Stats({ dict }: StatsProps) {
  const stats = [
    { icon: Download, label: dict.cta.plugins, value: '11' },
    { icon: Star, label: dict.cta.tests, value: '159+' },
    { icon: GitFork, label: dict.cta.license, value: 'MIT' },
    { icon: Users, label: dict.hero.openSource, value: '100%' },
  ]

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="text-center">
              <Icon className="mx-auto mb-3 h-8 w-8 text-primary" />
              <div className="mb-1 text-4xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
