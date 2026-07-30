import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://devcli.dev'

  const staticPages = [
    '',
    '/docs',
    '/docs/getting-started',
    '/docs/configuration',
    '/docs/architecture',
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

  return [
    ...staticPages.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.8,
    })),
    ...commands.map((cmd) => ({
      url: `${baseUrl}/commands/${cmd}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
