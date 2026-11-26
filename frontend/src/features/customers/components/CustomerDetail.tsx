import { Link } from 'react-router-dom'
import { Card } from "../../../components/ui/Card"
import { getCustomerStatus } from '../../customers/services/index'
import type { CustomerDetailRow } from '../../customers/types/customer'

type CustomerDetailProps = {
  customer: CustomerDetailRow | null
}

type CurrencyTotals = {
  outstanding: number
  sales: number
  payments: number
  adjustments: number
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined): string {
  const amount = Number(value ?? 0)
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const code = currency === 'ZWG' ? 'ZWG' : 'USD'

  return `${code} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)}`
}

function getCurrencyTotals(customer: CustomerDetailRow, currency: 'USD' | 'ZWG'): CurrencyTotals {
  return (customer.payments ?? []).reduce<CurrencyTotals>(
    (totals, entry) => {
      if (entry.currency !== currency) {
        return totals
      }

      const amount = Number(entry.amount ?? 0)
      if (!Number.isFinite(amount)) {
        return totals
      }

      totals.outstanding += amount

      if (entry.entry_type === 'sale_charge') {
        totals.sales += amount
      } else if (entry.entry_type === 'payment') {
        totals.payments += Math.abs(amount)
      } else if (entry.entry_type === 'adjustment') {
        totals.adjustments += amount
      }

      return totals
    },
    { outstanding: 0, sales: 0, payments: 0, adjustments: 0 },
  )
}

function FinancialMetric({
  label,
  value,
  currency,
}: {
  label: string
  value: number
  currency: 'USD' | 'ZWG'
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
        {formatMoney(value, currency)}
      </p>
    </div>
  )
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  if (!customer) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No customer found.
      </div>
    )
  }

  const usd = getCurrencyTotals(customer, 'USD')
  const zwg = getCurrencyTotals(customer, 'ZWG')
  const paymentEntries = (customer.payments ?? []).filter(
    (entry) => entry.entry_type === 'payment',
  )
  const adjustmentEntries = (customer.payments ?? []).filter(
    (entry) => entry.entry_type === 'adjustment',
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Customer detail
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {customer.full_name || customer.business_name || 'Customer'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {getCustomerStatus(customer)} customer
            {customer.phone ? ` · ${customer.phone}` : ''}
          </p>
        </div>
      </div>

      <Card padding="md">

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Financial account
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          {([
            ['USD', usd],
            ['ZWG', zwg],
          ] as const).map(([currency, totals]) => (
            <div
              key={currency}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                {currency} account
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FinancialMetric label="Outstanding balance" value={totals.outstanding} currency={currency} />
                <FinancialMetric label="Total sales" value={totals.sales} currency={currency} />
                <FinancialMetric label="Total payments" value={totals.payments} currency={currency} />
                <FinancialMetric label="Net adjustments" value={totals.adjustments} currency={currency} />
              </div>
            </div>
          ))}
        </div>
      </section>
      </Card>
      <Card padding="md">

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Packaging account
        </h2>

        {customer.packaging_balances?.length ? (
          <div className="space-y-2">
            {customer.packaging_balances.map((row) => {
              const quantity = Number(row.balance_quantity ?? 0)
              const owed = row.is_owed ?? quantity > 0

              return (
                <div
                  key={row.packaging_type_id ?? row.packaging_type_name ?? ''}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {row.packaging_type_name ?? row.packaging_type_id ?? 'Packaging'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {row.packaging_category ?? 'Packaging'}
                      {row.balance_quantity !== undefined
                        ? ` · ${quantity.toLocaleString()} units`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      owed
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {owed ? 'Owed' : 'Settled'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No packaging balances recorded.
          </p>
        )}
      </section>
      </Card>
      <Card padding="md">

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Sales history
        </h2>
        {customer.sales?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Sale</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {customer.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      {sale.sale_number ?? 'Draft sale'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {sale.status ?? '—'}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      {formatMoney(sale.total_amount, sale.currency)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        to={`/sales/${sale.id}`}
                        className="font-medium text-blue-600 underline dark:text-blue-400"
                      >
                        View sale
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No sales recorded for this customer.
          </p>
        )}
      </section>
      </Card>
      <Card padding="md">

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          Payment history
        </h2>
        {paymentEntries.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Method</th>
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {paymentEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      {formatMoney(Math.abs(Number(entry.amount ?? 0)), entry.currency)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {entry.payment_method?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {entry.reference ?? '—'}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.sale_id ? (
                        <Link
                          to={`/sales/${entry.sale_id}`}
                          className="text-blue-600 underline dark:text-blue-400"
                        >
                          View sale
                        </Link>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No payments recorded.
          </p>
        )}
      </section>
      </Card>
      {adjustmentEntries.length > 0 ? (
        <Card padding="md">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            Account adjustments
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {adjustmentEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      {formatMoney(entry.amount, entry.currency)}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {entry.notes ?? entry.reference ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </Card>
      ) : null}
    </div>
  )
}
