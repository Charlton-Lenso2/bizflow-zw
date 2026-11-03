import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ResolvedTheme, ThemeMode } from '../types/theme'

type ThemeContextValue = {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

const STORAGE_KEY = 'bizflow-theme-mode'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'system'
    }

    const savedMode = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return savedMode ?? 'system'
  })

  const resolvedTheme = mode === 'system' ? getSystemTheme() : mode

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, mode)
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [mode, resolvedTheme])

  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleThemeChange = () => {
      document.documentElement.classList.toggle('dark', mediaQuery.matches)
    }

    handleThemeChange()
    mediaQuery.addEventListener('change', handleThemeChange)

    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [mode])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.')
  }

  return context
}
