import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Comparisons } from '@/components/landing/Comparisons'
import { CTA } from '@/components/landing/CTA'
import { Stats } from '@/components/landing/Stats'
import { getDictionary } from '@/lib/i18n'
import { type Locale } from '@/lib/i18n/config'

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <>
      <Hero dict={dict} locale={locale} />
      <Features dict={dict} />
      <Comparisons dict={dict} />
      <Stats dict={dict} />
      <CTA dict={dict} locale={locale} />
    </>
  )
}
