import React, { useState } from 'react'
import { useInput, Text, Box } from 'ink'

export interface SearchInputProps {
  onSubmit: (value: string) => void
  placeholder?: string
}

export function SearchInput({ onSubmit, placeholder }: SearchInputProps): React.ReactElement {
  const [value, setValue] = useState('')

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value)
      return
    }
    if (key.backspace || key.delete) {
      setValue((v: string) => v.slice(0, -1))
      return
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((v: string) => v + input)
    }
  })

  return (
    <Box>
      <Text color="cyan">❯ </Text>
      <Text>{value || <Text dimColor>{placeholder ?? 'Search...'}</Text>}</Text>
      <Text color="cyan">█</Text>
    </Box>
  )
}
