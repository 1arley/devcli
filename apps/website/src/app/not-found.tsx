'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const messages = {
  en: { title: '404', description: 'Page not found', action: 'Go Home' },
  'pt-BR': { title: '404', description: 'Página não encontrada', action: 'Início' },
  es: { title: '404', description: 'Página no encontrada', action: 'Inicio' },
} as const

export default function NotFound() {
  const pathname = usePathname()
  const locale = pathname.startsWith('/pt-BR') ? 'pt-BR' : pathname.startsWith('/es') ? 'es' : 'en'
  const msg = messages[locale]

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold">{msg.title}</h1>
        <p className="mb-8 text-lg text-muted-foreground">{msg.description}</p>
        <Link
          href={`/${locale}`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {msg.action}
        </Link>
      </div>
    </div>
  )
}
