import {
  intro,
  outro,
  text,
  select,
  multiselect,
  confirm,
  spinner,
  note,
  log,
  cancel,
  isCancel,
} from '@clack/prompts'
import chalk from 'chalk'

export { intro, outro, text, select, multiselect, confirm, spinner, note, log, cancel, isCancel }

export interface PromptOptions<T> {
  message: string
  placeholder?: string
  initialValue?: T
  validate?: (value: T) => string | undefined
}

export interface ClackSelectOption {
  value: string
  label: string
  hint?: string
}

export interface SelectPromptOptions {
  message: string
  options: ClackSelectOption[]
  initialValue?: string
}

export interface MultiSelectPromptOptions {
  message: string
  options: ClackSelectOption[]
  initialValues?: string[]
  required?: boolean
}

export interface ConfirmPromptOptions {
  message: string
  initialValue?: boolean
}

export interface SpinnerOptions {
  message: string
}

export function promptText(options: PromptOptions<string>): Promise<string | symbol> {
  return text({
    message: options.message,
    placeholder: options.placeholder,
    initialValue: options.initialValue,
    validate: options.validate as Parameters<typeof text>[0]['validate'],
  })
}

export function promptSelect(options: SelectPromptOptions): Promise<string | symbol> {
  return select({
    message: options.message,
    options: options.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    })),
    initialValue: options.initialValue,
  })
}

export function promptMultiSelect(options: MultiSelectPromptOptions): Promise<string[] | symbol> {
  return multiselect({
    message: options.message,
    options: options.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
    })),
    initialValues: options.initialValues,
    required: options.required ?? false,
  })
}

export function promptConfirm(options: ConfirmPromptOptions): Promise<boolean | symbol> {
  return confirm({
    message: options.message,
    initialValue: options.initialValue ?? false,
  })
}

export function createSpinner(message: string) {
  const s = spinner()
  s.start(message)
  return s
}

export function showIntro(title: string): void {
  intro(chalk.bold.cyan(title))
}

export function showOutro(message: string): void {
  outro(message)
}

export function showNote(message: string, title?: string): void {
  note(message, title)
}

export function showLog(
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
): void {
  const symbols: Record<typeof type, string> = {
    info: chalk.cyan('ℹ'),
    success: chalk.green('✔'),
    warning: chalk.yellow('⚠'),
    error: chalk.red('✖'),
  }
  log.message(`${symbols[type]}  ${message}`)
}

export function showError(message: string): never {
  cancel(message)
  process.exit(1)
}

export function handleCancel<T>(result: T | symbol, onCancel?: () => void): T {
  if (isCancel(result)) {
    onCancel?.()
    process.exit(0)
  }
  return result
}

export const promptSymbols = {
  success: chalk.green('✔'),
  error: chalk.red('✖'),
  warning: chalk.yellow('⚠'),
  info: chalk.cyan('ℹ'),
  arrow: chalk.cyan('→'),
}
