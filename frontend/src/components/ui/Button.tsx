import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  isLoading?: boolean
  children: ReactNode
}

const baseClasses =
  'inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50'

const variantClasses: Record<ButtonVariant, string> = {
  primary: `${baseClasses} bg-[var(--brand-primary)] text-[var(--brand-primary-contrast)] border-[var(--brand-primary)] hover:opacity-92`,
  secondary: `${baseClasses} bg-[var(--brand-highlight)] text-[var(--brand-primary)] border-[var(--brand-primary)] hover:bg-[var(--brand-highlight)] hover:opacity-92`,
  ghost: `${baseClasses} bg-transparent text-[var(--app-foreground-muted)] hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-foreground)]`,
  danger: `${baseClasses} bg-transparent text-[var(--app-foreground-muted)] hover:bg-red-50/40 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400`,
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
      className={`${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
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
