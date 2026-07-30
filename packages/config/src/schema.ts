import { z } from 'zod'

export const DevCliConfigSchema = z.object({
  version: z.number().default(1),
  defaults: z
    .object({
      editor: z.string().default('code'),
      shell: z.string().default('bash'),
      theme: z.enum(['default', 'dark', 'light']).default('default'),
    })
    .default({}),
  ai: z
    .object({
      provider: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
      baseUrl: z.string().optional(),
    })
    .optional(),
  docker: z
    .object({
      socket: z.string().optional(),
    })
    .optional(),
  ports: z
    .object({
      ignore: z.array(z.number()).default([]),
    })
    .optional(),
})

export type DevCliConfig = z.infer<typeof DevCliConfigSchema>
