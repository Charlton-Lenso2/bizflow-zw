import { formatCustomerName, getCustomerStatus, isWalkInCustomer } from '../../customers/services/index'
import type { CustomerRecord } from '../../customers/types/customer'

type CustomerCardProps = {
  customer: CustomerRecord
  onView: (customer: CustomerRecord) => void
  onEdit: (customer: CustomerRecord) => void
}

export function CustomerCard({ customer, onView, onEdit }: CustomerCardProps) {
  const isWalkIn = isWalkInCustomer(customer)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{formatCustomerName(customer)}</h3>
            {isWalkIn && (
              <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Walk-in
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{customer.phone ?? 'No phone'}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => onView(customer)}
            className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={`View ${formatCustomerName(customer)}`}
          >
            View
          </button>
          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={`Edit ${formatCustomerName(customer)}`}
          >
            Edit
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Status</span>
          <span className="font-medium text-slate-900 dark:text-white">{getCustomerStatus(customer)}</span>
        </div>
        {customer.email ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Email</span>
            <span className="font-medium text-slate-900 dark:text-white truncate">{customer.email}</span>
          </div>
        ) : null}
        {customer.address ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Address</span>
            <span className="truncate font-medium text-slate-900 dark:text-white">{customer.address}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}