import Link from 'next/link'
import { Terminal } from 'lucide-react'

const footerLinks = {
  Product: [
    { href: '/docs', label: 'Documentation' },
    { href: '/commands', label: 'Commands' },
    { href: '/plugins', label: 'Plugins' },
    { href: '/roadmap', label: 'Roadmap' },
  ],
  Community: [
    { href: '/blog', label: 'Blog' },
    { href: '/changelog', label: 'Changelog' },
    { href: '/showcase', label: 'Showcase' },
    { href: '/contributing', label: 'Contributing' },
  ],
  Legal: [
    { href: 'https://github.com', label: 'GitHub' },
    { href: 'https://npmjs.com/package/@1arley/devcli', label: 'npm' },
    { href: '/license', label: 'License' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Terminal className="h-6 w-6" />
              <span>DevCLI</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              The Raycast of the Terminal for Developers.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold">{category}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} DevCLI. MIT License.</p>
        </div>
      </div>
    </footer>
  )
}
