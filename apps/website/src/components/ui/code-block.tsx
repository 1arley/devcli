'use client'

import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  className?: string
  highlight?: number[]
}

export function CodeBlock({ code, filename, className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        'group relative my-4 overflow-hidden rounded-lg border border-border',
        className,
      )}
    >
      {filename && (
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{filename}</span>
        </div>
      )}
      <pre className="overflow-x-auto bg-muted/30 p-4">
        <code className="font-mono text-sm text-foreground">{code}</code>
      </pre>
    </div>
  )
}
