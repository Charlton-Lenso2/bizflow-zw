import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type MetricCardAccent =
  | "brand"
  | "blue"
  | "green"
  | "amber"
  | "purple"
  | "neutral";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
  accent?: MetricCardAccent;
  className?: string;
};

const accentClasses: Record<MetricCardAccent, string> = {
  brand:
    "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  neutral:
    "bg-[var(--app-surface-elevated)] text-[var(--app-foreground-muted)]",
};

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent = "neutral",
  className = "",
}: MetricCardProps) {
  return (
    <article
      className={[
        "min-w-0 rounded-2xl border border-[var(--app-border)]",
        "bg-[var(--app-card)] p-4 shadow-sm sm:p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-5 text-[var(--app-foreground-muted)]">
            {label}
          </p>

          <div className="mt-3 break-words text-2xl font-bold tracking-tight text-[var(--app-foreground)]">
            {value}
          </div>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center",
            "rounded-xl",
            accentClasses[accent],
          ].join(" ")}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-2 text-xs leading-relaxed text-[var(--app-foreground-muted)]">
        {description}
      </div>
    </article>
  );
}
