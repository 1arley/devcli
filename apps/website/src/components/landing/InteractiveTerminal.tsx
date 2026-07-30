'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Terminal, Play } from 'lucide-react'
import { pluginDemos } from '@/lib/fixtures'
import type { PluginDemo } from '@/lib/fixtures/types'
import type { Dictionary } from '@/lib/i18n'

interface InteractiveTerminalProps {
  dict: Dictionary
}

export function InteractiveTerminal({ dict }: InteractiveTerminalProps) {
  const [selectedDemo, setSelectedDemo] = useState<PluginDemo>(pluginDemos[0]!)

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="font-mono text-sm">{dict.terminal.welcome}</span>
        </div>
        <Badge variant="outline">{dict.hero.plugins}</Badge>
      </div>

      <div className="grid md:grid-cols-[280px_1fr]">
        <div className="border-r border-border p-4">
          <p className="mb-4 text-sm text-muted-foreground">{dict.terminal.hint}</p>
          <div className="space-y-2">
            {pluginDemos.map((plugin) => (
              <Button
                key={plugin.plugin}
                variant={selectedDemo.plugin === plugin.plugin ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start font-mono"
                onClick={() => setSelectedDemo(plugin)}
              >
                <Play className="mr-2 h-3 w-3" />
                dev {plugin.plugin}
              </Button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-primary">$</span>
            <code className="font-mono">{selectedDemo.fixtures[0]?.command}</code>
          </div>

          <div className="rounded-lg bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">
              {selectedDemo.fixtures[0]?.output}
            </pre>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{selectedDemo.description}</p>
        </div>
      </div>
    </Card>
  )
}
