import type { Metadata } from 'next'
import { locales, type Locale } from '@/lib/i18n/config'

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params

  return {
    title: 'DevCLI - The Raycast of the Terminal',
    description:
      locale === 'en'
        ? 'One CLI. Dozens of developer tools. One consistent experience.'
        : locale === 'pt-BR'
          ? 'Uma CLI. Dezenas de ferramentas. Uma experiência consistente.'
          : 'Una CLI. Decenas de herramientas. Una experiencia consistente.',
    alternates: {
      canonical: `https://devcli.dev/${locale}`,
      languages: {
        'en-US': '/en',
        'pt-BR': '/pt-BR',
        es: '/es',
      },
    },
  }
}

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
