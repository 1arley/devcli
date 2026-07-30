# DevCLI Website

Official documentation website for DevCLI — The Raycast of the Terminal for Developers.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Components**: Radix UI + custom components
- **Animations**: Motion (Framer Motion)
- **Fonts**: Inter + JetBrains Mono
- **Theme**: Dark mode first with light mode support
- **Deployment**: Vercel-ready

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

## Project Structure

```
apps/website/
  src/
    app/              Pages and layouts
    components/       React components
    lib/              Utilities and fixtures
    styles/           Global styles
    types/            TypeScript types
  content/            MDX content (future)
  public/             Static assets
```

## Key Features

- **Interactive Terminal**: Simulate DevCLI commands with real fixture data
- **11 Command Pages**: Individual pages for each plugin with examples
- **Plugin Showcase**: Official, experimental, and planned plugins
- **Roadmap**: Visual timeline of completed and planned features
- **Changelog**: Release history with categorized changes
- **Documentation**: Getting started, configuration, and architecture guides
- **Responsive**: Mobile-first design
- **Dark Mode**: Theme toggle with system preference detection
- **SEO Optimized**: Metadata, Open Graph, Twitter Cards

## Demo Fixtures

Terminal demos use fixtures from `src/lib/fixtures/`. Each plugin exports demo data:

```typescript
export const pluginDemos: PluginDemo[] = [
  {
    plugin: 'doctor',
    category: 'dev',
    description: 'Environment diagnostics',
    fixtures: [
      {
        id: 'doctor-healthy',
        title: 'Healthy environment',
        command: 'dev doctor',
        description: 'All tools installed and configured',
        output: `...`,
      },
    ],
  },
]
```

This keeps demos in sync with actual plugin output and makes updates easy.

## Development

```bash
# Run all checks
pnpm typecheck && pnpm lint && pnpm build
```

## Deployment

Ready for Vercel deployment:

1. Push to GitHub
2. Connect repo to Vercel
3. Deploy automatically on push to main

Environment variables (optional):
- `NEXT_PUBLIC_SITE_URL` — Site URL for metadata

## License

MIT — Same as DevCLI
