import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../features/theme/context/ThemeContext'

export function ThemeSwitcher() {
  const { mode, resolvedTheme, setMode } = useTheme()

  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
      {(['light', 'dark', 'system'] as const).map((option) => {
        const isActive = mode === option
        const isSystem = option === 'system'

        return (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            aria-label={`Set theme to ${option}`}
          >
            {option === 'light' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{isSystem ? 'System' : option}</span>
          </button>
        )
      })}
      <div className="sr-only">Current theme: {resolvedTheme}</div>
    </div>
  )
}
