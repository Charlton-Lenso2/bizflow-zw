import { useMemo, useState } from 'react'
import { CustomerCard } from './CustomerCard'
import type { CustomerRecord } from '../../customers/types/customer'

type CustomerListProps = {
  customers: CustomerRecord[]
  filters: { status: 'all' | 'active' | 'inactive'; search: string }
  onFilterChange: (status: 'all' | 'active' | 'inactive', search: string) => void
  onView: (customer: CustomerRecord) => void
  onEdit: (customer: CustomerRecord) => void
}

export function CustomerList({ customers, filters, onFilterChange, onView, onEdit }: CustomerListProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase()
    return customers.filter((customer) => {
      if (filters.status === 'active' && !customer.is_active) {
        return false
      }
      if (filters.status === 'inactive' && customer.is_active) {
        return false
      }
      if (!q) {
        return true
      }
      const haystack = [
        customer.full_name,
        customer.business_name,
        customer.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [customers, filters.status, localSearch])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search name, phone…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            aria-label="Search customers"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onFilterChange(status, localSearch)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold capitalize transition ${filters.status === status
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}
              `}
              aria-pressed={filters.status === status}
            >
              {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No customers match the current filters.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onView={onView}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
