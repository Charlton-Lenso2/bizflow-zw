import type { ReactNode } from 'react'

type AlertVariant = 'info' | 'success' | 'error' | 'warning'

type AlertProps = {
  variant?: AlertVariant
  title?: string
  children?: ReactNode
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-[var(--brand-primary)] bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/20 dark:text-blue-300',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-300',
  error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/20 dark:text-red-300',
}

export function Alert({ variant = 'info', title, children }: AlertProps) {
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${variantClasses[variant]}`}
      role="alert"
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  )
}
