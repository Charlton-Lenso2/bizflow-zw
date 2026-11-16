import { Building2, ChevronDown } from 'lucide-react'
import { useBusiness } from '../hooks/useActiveBusiness'

export function BusinessSelector() {
  const { businesses, activeBusinessId, selectBusiness, isLoading } = useBusiness()

  const businessEntries = businesses.filter(
    (membership): membership is typeof membership & {
      businesses: NonNullable<typeof membership.businesses>
    } => Boolean(membership.businesses),
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Building2 className="h-4 w-4" />
        Loading workspaces...
      </div>
    )
  }

  if (businessEntries.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <Building2 className="h-[18px] w-[18px]" />
        </span>

        <div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Active workspace
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Switch between your businesses
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            aria-label="Select active business"
            value={activeBusinessId ?? ''}
            onChange={(event) => selectBusiness(event.target.value || null)}
            className="h-10 min-w-[180px] appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-9 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-950"
          >
            {businessEntries.map((membership) => (
              <option key={membership.business_id} value={membership.business_id}>
                {membership.businesses.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        {activeBusinessId && (
          <button
            type="button"
            onClick={() => selectBusiness(null)}
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
