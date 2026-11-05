import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  isLoading?: boolean
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, Record<string, string>> = {
  primary: {
    background: 'var(--brand-primary)',
    color: 'var(--brand-primary-contrast)',
    borderColor: 'var(--brand-primary)',
  },
  secondary: {
    background: 'var(--brand-highlight)',
    color: 'var(--brand-primary)',
    borderColor: 'var(--brand-primary)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--brand-primary)',
    borderColor: 'transparent',
  },
}

export function Button({
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed ${className}`}
      style={{
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
