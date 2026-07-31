'use client'

import { usePathname } from 'next/navigation'

const messages = {
  en: { title: 'Something went wrong', action: 'Try again' },
  'pt-BR': { title: 'Algo deu errado', action: 'Tentar novamente' },
  es: { title: 'Algo salió mal', action: 'Intentar de nuevo' },
} as const

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const locale = pathname.startsWith('/pt-BR') ? 'pt-BR' : pathname.startsWith('/es') ? 'es' : 'en'
  const msg = messages[locale]

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{msg.title}</h1>
        <p className="mb-8 text-lg text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {msg.action}
        </button>
      </div>
    </div>
  )
}
