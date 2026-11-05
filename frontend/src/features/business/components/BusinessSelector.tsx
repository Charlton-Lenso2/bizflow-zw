import { Button } from '../../../components/ui/Button'
import { useBusiness } from '../hooks/useActiveBusiness'

export function BusinessSelector() {
  const { businesses, activeBusinessId, selectBusiness, isLoading } = useBusiness()

  const businessEntries = businesses.filter(
    (membership): membership is typeof membership & { businesses: NonNullable<typeof membership.businesses> } =>
      Boolean(membership.businesses),
  )

  if (isLoading) {
    return <span className="text-sm text-slate-500">Loading businesses...</span>
  }

  if (businessEntries.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900/70">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        Active business
        <select
          value={activeBusinessId ?? ''}
          onChange={(event) => selectBusiness(event.target.value || null)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.02)' }}
        >
          {businessEntries.map((membership) => (
            <option key={membership.business_id} value={membership.business_id}>
              {membership.businesses.name}
            </option>
          ))}
        </select>
      </label>

      <Button variant="secondary" type="button" onClick={() => selectBusiness(null)}>
        Clear selection
      </Button>
    </div>
  )
}
