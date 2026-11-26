import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "muted" | "outlined";
type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
};

const variantClasses: Record<CardVariant, string> = {
  default:
    "border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm",
  muted:
    "border border-[var(--app-border)] bg-[var(--app-surface-elevated)]",
  outlined:
    "border border-dashed border-[var(--app-border-strong)] bg-transparent",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-4 sm:p-5",
};

export function Card({
  children,
  variant = "default",
  padding = "none",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "min-w-0 rounded-2xl",
        variantClasses[variant],
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
