import type { ReactNode } from 'react'

type AlertProps = {
  variant?: 'info' | 'success' | 'error'
  title?: string
  children?: ReactNode
}

const variantClasses: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
}

export function Alert({ variant = 'info', title, children }: AlertProps) {
  return (
    <div className={`rounded-2xl border p-4 text-sm ${variantClasses[variant]}`} role="alert">
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      {children}
    </div>
  )
}
