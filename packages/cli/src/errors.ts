/**
 * Custom error classes for Dev CLI.
 *
 * All errors include:
 * - A short, user-friendly message
 * - An optional suggestion for the next step
 * - An optional cause (the underlying error)
 * - A non-zero exit code
 */
export class CliError extends Error {
  readonly code: number
  readonly suggestion?: string
  readonly cause?: unknown

  constructor(
    message: string,
    options: { code?: number; suggestion?: string; cause?: unknown } = {},
  ) {
    super(message)
    this.name = 'CliError'
    this.code = options.code ?? 1
    this.suggestion = options.suggestion
    this.cause = options.cause
  }
}

export class UserError extends CliError {
  constructor(message: string, suggestion?: string) {
    super(message, { code: 64, suggestion })
    this.name = 'UserError'
  }
}

export class NotFoundError extends CliError {
  constructor(resource: string, suggestion?: string) {
    super(`${resource} not found`, {
      code: 2,
      suggestion: suggestion ?? `Check that ${resource} is installed and available on PATH.`,
    })
    this.name = 'NotFoundError'
  }
}

export class PermissionError extends CliError {
  constructor(action: string, target: string) {
    super(`Permission denied: ${action} ${target}`, {
      code: 77,
      suggestion: `Try running with elevated privileges (sudo) or check file/directory permissions.`,
    })
    this.name = 'PermissionError'
  }
}

export class ValidationError extends CliError {
  constructor(message: string, suggestion?: string) {
    super(message, { code: 65, suggestion })
    this.name = 'ValidationError'
  }
}

export class TimeoutError extends CliError {
  constructor(operation: string, ms: number) {
    super(`Operation timed out: ${operation} (${ms}ms)`, {
      code: 124,
      suggestion: `Increase timeout or check network/system responsiveness.`,
    })
    this.name = 'TimeoutError'
  }
}

export function toCliError(err: unknown): CliError {
  if (err instanceof CliError) return err
  if (err instanceof Error) {
    const message = err.message || err.name || 'Unknown error'
    return new CliError(message, { code: 1, cause: err })
  }
  return new CliError(String(err), { code: 1 })
}
