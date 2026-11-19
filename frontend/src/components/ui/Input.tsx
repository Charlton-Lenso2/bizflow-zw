import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({
  label,
  id,
  error,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label && (
        <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--app-foreground-subtle)]">
          {label}
        </span>
      )}

      <input
        id={inputId}
        className={`w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-input)] px-3 py-3 text-sm text-[var(--app-foreground)] shadow-sm outline-none transition placeholder:text-[var(--app-foreground-subtle)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 disabled:cursor-not-allowed disabled:bg-[var(--app-surface-elevated)] disabled:text-[var(--app-foreground-subtle)] ${
          error
            ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
            : ""
        } ${className}`}
        aria-invalid={error ? true : undefined}
        {...props}
      />

      {error && (
        <span className="block text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}
