export const locales = ['en', 'pt-BR', 'es'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português',
  es: 'Español',
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}
