import { useEffect, useMemo, type ReactNode } from 'react'
import { Menu, Bell, ChevronDown, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { useBusiness } from '../../features/business/hooks/useActiveBusiness'
import { applyBrandPalette, getBusinessBranding } from '../../features/business/utils/brandPalette'
import { ThemeSwitcher } from '../ui/ThemeSwitcher'

const navItems = [
  { label: 'Dashboard', route: '/dashboard', enabled: true },
  { label: 'Products', route: '/catalogue', enabled: true },
  { label: 'Inventory', route: '/inventory', enabled: true },
  { label: 'Pos', route: '/pos', enabled: true },
  { label: 'Sales', route: '/sales', enabled: true },
  { label: 'Customers', route: '/customers', enabled: true },
  { label: 'AI Assistant', route: '/ai', enabled: true },
  { label: 'Packaging', route: '/packaging', enabled: true },
  { label: 'Credit', route: '/credit', enabled: true },
  { label: 'Reports', route: '/reports', enabled: true },
  { label: 'Settings', route: '/settings', enabled: true },
] as const

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { activeBusiness } = useBusiness()
  const activeBranding = useMemo(
    () => getBusinessBranding(activeBusiness?.id ?? null, activeBusiness?.logo_url ?? null),
    [activeBusiness?.id, activeBusiness?.logo_url],
  )

  useEffect(() => {
    applyBrandPalette(activeBranding.palette)
  }, [activeBranding.palette])

  const initials = activeBusiness?.name ? activeBusiness.name.slice(0, 2).toUpperCase() : 'BZ'

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] p-3 lg:p-4">
        <aside className="hidden w-70 shrink-0 rounded-[28px] border-border p-5 shadow-sm shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur dark:border-border dark:bg-slate-900 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-border pb-5 dark:border-border-dark">
            <div
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl text-sm font-semibold text-white shadow-sm"
              style={{
                background: 'var(--brand-primary)',
                color: 'var(--brand-primary-contrast)',
              }}
            >
              {activeBranding.logoUrl ? (
                <img src={activeBranding.logoUrl} alt={activeBusiness?.name ?? 'Business logo'} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">BizFlow</p>
              <h1 className="text-base font-semibold text-foreground dark:text-white">ZW</h1>
            </div>
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item, index) => {
              const isSelected = item.route === location.pathname

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
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium transition"
                  style={
                    item.enabled
                      ? isSelected
                        ? {
                            background: 'var(--brand-primary)',
                            color: 'var(--brand-primary-contrast)',
                            boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
                          }
                        : undefined
                      : {
                          cursor: 'not-allowed',
                          opacity: 0.7,
                        }
                  }
                  aria-label={item.enabled ? item.label : `${item.label} coming soon`}
                >
                  <span>{item.label}</span>
                  {item.enabled && index === 0 ? <Sparkles className="h-4 w-4" /> : null}
                  {!item.enabled ? <span className="text-[10px] uppercase tracking-[0.16em]">Soon</span> : null}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-2xl border-border p-4 dark:border-border dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Active business</p>
            <p className="mt-2 text-sm font-semibold text-foreground dark:text-white">
              {activeBusiness?.name ?? 'No business'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-900">
          <header className="border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-border bg-background text-slate-600 transition hover:bg-[var(--color-border)] data-[state=active]:bg-[var(--color-border)] data-[state=active]:text-[var(--color-primary-foreground)] dark:border-border dark:text-slate-400 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </button>

                <div className="rounded-xl border-border bg-background px-3 py-1.5 text-sm dark:border-border-dark dark:bg-slate-800">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Workspace</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block">
                  <ThemeSwitcher />
                </div>

                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-border bg-background text-slate-600 transition hover:bg-[var(--color-border)] dark:border-border dark:text-slate-400"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{
                      background: 'var(--brand-primary)',
                      color: 'var(--brand-primary-contrast)',
                    }}
                  >
                    {user?.email?.slice(0, 1).toUpperCase() ?? 'U'}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Signed in</p>
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
