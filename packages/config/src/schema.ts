import { z } from 'zod'

export const DevCliConfigSchema = z.object({
  version: z.number().default(1).readonly(),
  defaults: z
    .object({
      editor: z.string().default('code'),
      shell: z.string().default('bash'),
      theme: z.enum(['default', 'dark', 'light']).default('default'),
    })
    .default({})
    .readonly(),
  ai: z
    .object({
      provider: z.enum(['openai', 'anthropic', 'ollama']).optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
  docker: z
    .object({
      socket: z.string().optional(),
    })
    .optional(),
  ports: z
    .object({
      ignore: z.array(z.number()).default([]).readonly(),
    })
    .optional(),
})

export type DevCliConfig = z.infer<typeof DevCliConfigSchema>
