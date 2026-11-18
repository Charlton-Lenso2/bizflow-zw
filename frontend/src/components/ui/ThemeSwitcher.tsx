import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../features/theme/context/ThemeContext";

export function ThemeSwitcher() {
  const { resolvedTheme, setMode } = useTheme();

  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    setMode(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-foreground-muted)] shadow-sm transition-all hover:border-[var(--brand-primary)] hover:bg-[var(--app-surface-elevated)] hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.8} />
      ) : (
        <Moon size={18} strokeWidth={1.8} />
      )}
    </button>
  );
}
