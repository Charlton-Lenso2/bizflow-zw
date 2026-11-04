import type { ReactNode } from 'react'
import { Menu, Bell, ChevronDown, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useBusiness } from '../../features/business/hooks/useActiveBusiness'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'

const navItems = [
  { label: 'Dashboard', route: '/dashboard', enabled: true },
  { label: 'Products', route: '/catalogue', enabled: true },
  { label: 'Inventory', route: null, enabled: false },
  { label: 'Sales', route: null, enabled: false },
  { label: 'Customers', route: null, enabled: false },
  { label: 'Suppliers', route: null, enabled: false },
  { label: 'Packaging', route: null, enabled: false },
  { label: 'Credit', route: null, enabled: false },
  { label: 'Reports', route: null, enabled: false },
  { label: 'Settings', route: null, enabled: false },
] as const

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeBusiness } = useBusiness()

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/80 p-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
              BZ
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">BizFlow</p>
              <h1 className="text-base font-semibold">ZW</h1>
            </div>
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item, index) => {
              const isSelected = item.route === '/dashboard' || item.route === '/catalogue'

              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={!item.enabled}
                  onClick={() => {
                    if (item.enabled && item.route) {
                      navigate(item.route)
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    item.enabled
                      ? isSelected
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      : 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                  }`}
                  aria-label={item.enabled ? item.label : `${item.label} coming soon`}
                >
                  <span>{item.label}</span>
                  {item.enabled && index === 0 ? <Sparkles className="h-4 w-4" /> : null}
                  {!item.enabled ? <span className="text-[10px] uppercase tracking-[0.16em]">Soon</span> : null}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active business</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {activeBusiness?.name ?? 'No business'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Workspace</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block">
                  <ThemeSwitcher />
                </div>

                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                    {user?.email?.slice(0, 1).toUpperCase() ?? 'U'}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Signed in</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {user?.email?.split('@')[0] ?? 'User'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
