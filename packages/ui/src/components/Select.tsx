import React, { useState } from 'react'
import { useInput, Text, Box } from 'ink'

export interface SelectOption {
  label: string
  value: string
  hint?: string
}

export interface SelectProps {
  options: SelectOption[]
  onSelect: (value: string) => void
  title?: string
}

export function Select({ options, onSelect, title }: SelectProps): React.ReactElement {
  const [selected, setSelected] = useState(0)

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelected((s: number) => (s - 1 + options.length) % options.length)
    } else if (key.downArrow) {
      setSelected((s: number) => (s + 1) % options.length)
    } else if (key.return) {
      onSelect(options[selected]?.value ?? '')
    }
  })

  return (
    <Box flexDirection="column">
      {title && (
        <Text bold color="cyan">
          {title}
        </Text>
      )}
      {options.map((opt, i) => (
        <Box key={opt.value}>
          <Text color={i === selected ? 'cyan' : 'gray'}>{i === selected ? '❯ ' : '  '}</Text>
          <Text color={i === selected ? 'white' : 'gray'} bold={i === selected}>
            {opt.label}
          </Text>
          {opt.hint && <Text dimColor> — {opt.hint}</Text>}
        </Box>
      ))}
    </Box>
  )
}
