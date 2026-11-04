import { useEffect, useMemo, useState } from 'react'
import { Activity, Boxes, PackageCheck, ShoppingCart, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { LoadingState } from '../../../components/ui/LoadingState'
import { BusinessSelector } from '../../business/components/BusinessSelector'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import { useAuth } from '../../auth/hooks/useAuth'
import { fetchDashboardSummary } from '../services/dashboardService'
import type { DashboardSummary } from '../types/dashboard'

const navigationItems = [
  'Products',
  'Inventory',
  'Sales',
  'Customers',
  'Suppliers',
  'Packaging',
  'Credit',
  'Reports',
]

const metricStyles = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  muted: 'border-violet-200 bg-violet-50 text-violet-700',
} as const

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { activeBusiness, activeBusinessId, isLoading } = useBusiness()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasActiveBusinessSelection = Boolean(activeBusinessId)

  useEffect(() => {
    if (!activeBusinessId) {
      return
    }

    let isMounted = true

    const loadSummary = async () => {
      setSummary(null)
      setIsLoadingSummary(true)
      setErrorMessage(null)

      try {
        const nextSummary = await fetchDashboardSummary(activeBusinessId)

        if (!isMounted) {
          return
        }

        setSummary(nextSummary)
      } catch (error) {
        if (!isMounted) {
          return
        }

        console.error('Failed to load dashboard summary', error)
        setSummary(null)
        setErrorMessage('We could not load the dashboard for this business right now.')
      } finally {
        if (isMounted) {
          setIsLoadingSummary(false)
        }
      }
    }

    void loadSummary()

    return () => {
      isMounted = false
    }
  }, [activeBusinessId])

  const metricCards = useMemo(
    () => [
      {
        label: 'Products',
        value: summary ? summary.productCount.toLocaleString() : '0',
        detail: 'Recorded product families',
        tone: 'neutral' as const,
        icon: Boxes,
      },
      {
        label: 'Active variants',
        value: summary ? summary.activeVariantCount.toLocaleString() : '0',
        detail: 'Current active variants',
        tone: 'info' as const,
        icon: PackageCheck,
      },
      {
        label: 'On-hand crates',
        value:
          summary && summary.stockOnHand !== null
            ? summary.stockOnHand.toLocaleString()
            : summary && summary.stockSource === 'unavailable'
              ? 'Unavailable'
              : '0',
        detail:
          summary && summary.stockSource === 'projection'
            ? 'From live stock projection'
            : 'Stock projection unavailable',
        tone: 'success' as const,
        icon: TrendingUp,
      },
      {
        label: 'Completed sales',
        value: summary ? summary.completedSalesCount.toLocaleString() : '0',
        detail: 'Recorded in current business',
        tone: 'muted' as const,
        icon: ShoppingCart,
      },
    ],
    [summary],
  )

  if (isLoading || isLoadingSummary) {
    return <LoadingState message={isLoading ? 'Loading your businesses...' : 'Loading dashboard...'} />
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Business workspace
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {activeBusiness?.name ?? 'No active business'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/onboarding')}>
            New business
          </Button>
          <Button type="button" variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <BusinessSelector />

      {!activeBusiness ? (
        <Alert variant="info" title="No active business selected">
          Create a business or choose one from the selector above to continue.
        </Alert>
      ) : null}

      {hasActiveBusinessSelection && errorMessage ? (
        <Alert variant="error" title="Dashboard unavailable">
          {errorMessage}
        </Alert>
      ) : null}

      {activeBusiness ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(({ label, value, detail, tone, icon: Icon }) => (
              <div
                key={label}
                className={`rounded-2xl border p-4 shadow-sm ${metricStyles[tone]} dark:border-slate-700 dark:bg-slate-900`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{label}</p>
                  <span className="rounded-lg bg-white/70 p-2 dark:bg-slate-800/80">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
              </div>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Business overview
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    Recent activity
                  </h2>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Activity className="h-3.5 w-3.5" />
                  Live data
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {summary?.recentActivity.length ? (
                  summary.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Timestamp unavailable'}
                        </p>
                      </div>
                      {item.amountText ? (
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                          {item.amountText}
                        </span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    No recent business activity has been recorded for this business yet.
                  </div>
                )}
              </div>
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Quick navigation
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Business modules</h2>

              <div className="mt-5 grid gap-2">
                {navigationItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    aria-label={`${item} coming soon`}
                  >
                    <span>{item}</span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Soon</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Business details</p>
                <dl className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div>
                    <dt className="font-medium text-slate-700 dark:text-slate-200">Business type</dt>
                    <dd>{activeBusiness.business_type}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700 dark:text-slate-200">Default currency</dt>
                    <dd>{activeBusiness.default_currency}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700 dark:text-slate-200">Phone</dt>
                    <dd>{activeBusiness.phone ?? 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700 dark:text-slate-200">Address</dt>
                    <dd>{activeBusiness.address ?? 'Not provided'}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </>
      ) : null}

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
        Signed in as {user?.email ?? 'team member'}.
      </div>
    </div>
  )
}
