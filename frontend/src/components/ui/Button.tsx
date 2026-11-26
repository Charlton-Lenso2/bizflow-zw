import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  isLoading?: boolean
  children: ReactNode
}

const baseClasses = [
  'inline-flex min-h-10 items-center justify-center gap-2',
  'rounded-xl border px-4 py-2.5',
  'text-sm font-semibold leading-5',
  'outline-none transition-all duration-150 ease-out',
  'focus-visible:ring-4 focus-visible:ring-[var(--brand-primary)]/20',
  'active:scale-[0.98]',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'border-[var(--brand-primary)]',
    'bg-[var(--brand-primary)]',
    'text-[var(--brand-primary-contrast)]',
    'shadow-sm',
    'hover:brightness-105 hover:shadow-md',
    'active:brightness-95',
  ].join(' '),

  secondary: [
    'border-[var(--app-border-strong)]',
    'bg-[var(--app-surface)]',
    'text-[var(--app-foreground)]',
    'shadow-sm',
    'hover:border-[var(--brand-primary)]/40',
    'hover:bg-[var(--app-surface-elevated)]',
  ].join(' '),

  ghost: [
    'border-transparent',
    'bg-transparent',
    'text-[var(--app-foreground-muted)]',
    'hover:border-[var(--app-border)]',
    'hover:bg-[var(--app-surface-elevated)]',
    'hover:text-[var(--app-foreground)]',
  ].join(' '),

  danger: [
    'border-red-200',
    'bg-red-50',
    'text-red-700',
    'hover:border-red-300 hover:bg-red-100',
    'dark:border-red-900/60',
    'dark:bg-red-950/30',
    'dark:text-red-300',
    'dark:hover:bg-red-950/60',
  ].join(' '),
}

export function Button({
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
