import { MetadataRoute } from 'next'
import { locales } from '@/lib/i18n/config'
import { SITE_URL } from '@/lib/urls'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/docs',
    '/docs/getting-started',
    '/docs/configuration',
    '/docs/architecture',
    '/docs/plugins',
    '/docs/commands',
    '/docs/contributing',
    '/commands',
    '/plugins',
    '/roadmap',
    '/blog',
    '/changelog',
    '/showcase',
    '/contributing',
  ]

  const commands = [
    'doctor',
    'docker',
    'ports',
    'git',
    'json',
    'jwt',
    'uuid',
    'qr',
    'env',
    'repo',
    'ai',
  ]

  const allPaths = [
    ...staticPages.map((path) => ({ path, priority: path === '' ? 1 : 0.8 })),
    ...commands.map((cmd) => ({ path: `/commands/${cmd}`, priority: 0.7 })),
  ]

  return locales.flatMap((locale) =>
    allPaths.map(({ path, priority }) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority,
    })),
  )
}
