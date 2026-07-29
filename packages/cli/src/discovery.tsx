import React, { useState } from 'react'
import { useInput, Text, Box, render } from 'ink'
import type { PluginManifest } from '@dev-cli/core'

export interface DiscoveryAppProps {
  manifests: PluginManifest[]
  onSelect: (name: string) => void
}

function DiscoveryApp({ manifests, onSelect }: DiscoveryAppProps): React.ReactElement {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)

  const filtered = manifests.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.description.toLowerCase().includes(query.toLowerCase()) ||
      m.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase())),
  )

  useInput((input, key) => {
    if (key.return) {
      const picked = filtered[selected]
      if (picked) onSelect(picked.name)
      return
    }
    if (key.backspace || key.delete) {
      setQuery((q: string) => q.slice(0, -1))
      setSelected(0)
      return
    }
    if (key.upArrow) {
      setSelected((s: number) => Math.max(0, s - 1))
      return
    }
    if (key.downArrow) {
      setSelected((s: number) => Math.min(filtered.length - 1, s + 1))
      return
    }
    if (key.escape) {
      process.exit(0)
      return
    }
    if (input && !key.ctrl && !key.meta && !key.tab) {
      setQuery((q: string) => q + input)
      setSelected(0)
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Dev CLI
      </Text>
      <Text dimColor>Search commands... (ESC to quit)</Text>
      <Box marginY={1}>
        <Text color="cyan">❯ </Text>
        <Text>{query || <Text dimColor>Type to search...</Text>}</Text>
        <Text color="cyan">█</Text>
      </Box>
      <Box flexDirection="column">
        {filtered.map((m, i) => (
          <Box key={m.name}>
            <Text color={i === selected ? 'cyan' : 'gray'}>{i === selected ? '❯ ' : '  '}</Text>
            <Text color={i === selected ? 'white' : 'gray'} bold={i === selected}>
              {m.name.padEnd(10)}
            </Text>
            <Text dimColor>{m.description.slice(0, 60)}</Text>
          </Box>
        ))}
        {filtered.length === 0 && <Text dimColor>No commands found</Text>}
      </Box>
    </Box>
  )
}

export function showDiscovery(manifests: PluginManifest[], onSelect: (name: string) => void): void {
  render(<DiscoveryApp manifests={manifests} onSelect={onSelect} />)
}
