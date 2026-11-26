import { useId, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({
  label,
  id,
  error,
  className = "",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const errorId = `${inputId}-error`;

  const describedBy = [
    ariaDescribedBy,
    error ? errorId : undefined,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className="grid w-full gap-2">
      {label ? (
        <label
          className="block text-sm font-semibold leading-5 text-[var(--app-foreground)]"
          htmlFor={inputId}
        >
          {label}
        </label>
      ) : null}

      <input
        id={inputId}
        className={[
          "min-h-11 w-full rounded-xl border",
          "border-[var(--app-border-strong)]",
          "bg-[var(--app-input)] px-3.5 py-2.5",
          "text-sm leading-5 text-[var(--app-foreground)]",
          "shadow-sm outline-none",
          "placeholder:text-[var(--app-foreground-subtle)]",
          "transition-all duration-150",
          "hover:border-[var(--brand-primary)]/45",
          "focus:border-[var(--brand-primary)]",
          "focus:ring-4 focus:ring-[var(--brand-primary)]/10",
          "disabled:cursor-not-allowed",
          "disabled:bg-[var(--app-surface-elevated)]",
          "disabled:text-[var(--app-foreground-subtle)]",
          "disabled:opacity-70",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
            : "",
          className,
        ].filter(Boolean).join(" ")}
        aria-invalid={error ? true : ariaInvalid}
        aria-describedby={describedBy}
        {...props}
      />

      {error ? (
        <p
          id={errorId}
          className="text-xs font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
