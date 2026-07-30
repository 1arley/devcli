import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'

const variants = {
  default: {
    icon: Info,
    className: 'border-border bg-card',
    iconClass: 'text-muted-foreground',
  },
  info: {
    icon: Info,
    className: 'border-info/20 bg-info/5',
    iconClass: 'text-info',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-success/20 bg-success/5',
    iconClass: 'text-success',
  },
  warning: {
    icon: AlertCircle,
    className: 'border-warning/20 bg-warning/5',
    iconClass: 'text-warning',
  },
  error: {
    icon: XCircle,
    className: 'border-destructive/20 bg-destructive/5',
    iconClass: 'text-destructive',
  },
}

export function Callout({
  variant = 'default',
  title,
  children,
  className,
}: {
  variant?: keyof typeof variants
  title?: string
  children: React.ReactNode
  className?: string
}) {
  const v = variants[variant]
  const Icon = v.icon

  return (
    <div className={cn('my-4 rounded-lg border p-4', v.className, className)}>
      <div className="flex gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', v.iconClass)} />
        <div>
          {title && <p className="mb-1 font-semibold">{title}</p>}
          <div className="text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  )
}
