'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  url: string
  title: string
  excerpt: string
  meta?: Record<string, string>
}

interface PagefindResult {
  id: string
  data: () => Promise<{ url: string; excerpt: string; meta?: Record<string, string> }>
}

interface PagefindClient {
  search: (q: string) => Promise<{ results: PagefindResult[] }>
}

export function SearchDialog({ locale: _locale }: { locale: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [pagefind, setPagefind] = useState<PagefindClient | null>(null)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const initPagefind = async () => {
      try {
        const pf = await import(
          /* webpackIgnore: true */
          // @ts-expect-error pagefind is injected at deploy time
          '/pagefind/pagefind.js'
        )
        setPagefind(pf as PagefindClient)
      } catch {
        // pagefind not available — search silently disabled
      }
    }
    initPagefind()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSearch = async (value: string) => {
    setQuery(value)
    if (!pagefind || !value.trim()) {
      setResults([])
      return
    }

    const searchResult = await pagefind.search(value)
    const dataList = searchResult.results.slice(0, 10)
    const detailedResults = await Promise.all(
      dataList.map(
        async (result: {
          id: string
          data: () => Promise<{ url: string; excerpt: string; meta?: Record<string, string> }>
        }) => {
          const data = await result.data()
          return {
            id: result.id,
            url: data.url,
            title: data.meta?.title || 'Untitled',
            excerpt: data.excerpt,
            meta: data.meta,
          }
        },
      ),
    )
    setResults(detailedResults)
  }

  const handleSelect = (url: string) => {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(url)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Search documentation</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              placeholder="Search commands, plugins, docs..."
              value={query}
              onValueChange={handleSearch}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {results.length > 0 && (
                <CommandGroup heading="Results">
                  {results.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.url}
                      onSelect={() => handleSelect(result.url)}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{result.title}</span>
                        <span
                          className="text-xs text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.excerpt }}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
