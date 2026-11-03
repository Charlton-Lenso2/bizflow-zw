import { useNavigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { LoadingState } from '../../../components/ui/LoadingState'
import { BusinessSelector } from '../../business/components/BusinessSelector'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import { useAuth } from '../../auth/hooks/useAuth'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { activeBusiness, isLoading } = useBusiness()

  if (isLoading) {
    return <LoadingState message="Loading your businesses..." />
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Business workspace</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
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

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>Welcome, {user?.email ?? 'team member'}.</p>
              {activeBusiness ? (
                <>
                  <p>Business type: {activeBusiness.business_type}</p>
                  <p>Default currency: {activeBusiness.default_currency}</p>
                </>
              ) : (
                <Alert variant="info" title="No active business selected">
                  Create a business or choose one from the selector above to continue.
                </Alert>
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Business details</h2>
            {activeBusiness ? (
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div>
                  <dt className="font-medium text-slate-700">Phone</dt>
                  <dd>{activeBusiness.phone ?? 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Address</dt>
                  <dd>{activeBusiness.address ?? 'Not provided'}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No details available until a business is selected.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
