import { formatCurrency, getCustomerStatus } from '../../customers/services/index'
import type { CustomerDetailRow } from '../../customers/types/customer'

type CustomerDetailProps = {
  customer: CustomerDetailRow | null
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  if (!customer) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No customer found.
      </div>
    )
  }

  const amounts = customer.payments?.map(e => Number(e.amount) || 0) ?? []
  const totalSales = amounts.filter(a => a > 0).reduce((sum, a) => sum + a, 0) ?? 0
  const totalPayments = amounts.filter(a => a < 0).reduce((sum, a) => sum + a, 0) * -1
  const outstanding = amounts.reduce((sum, a) => sum + a, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Customer detail</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{getCustomerStatus(customer) === 'Active' ? 'Active customer' : 'Inactive customer'}</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Outstanding credit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(outstanding)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Total sales</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalSales)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Total payments</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(totalPayments)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Financial account</h2>

          <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Outstanding balance</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(outstanding)}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total sales</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totalSales)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total payments</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(totalPayments)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Packaging account</h2>

          {customer.packaging_balances?.length ? (
            <div className="space-y-2">
              {customer.packaging_balances.map((row) => (
                <div key={row.packaging_type_id ?? row.packaging_type_name ?? ''} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{row.packaging_type_name ?? row.packaging_type_id ?? 'Packaging'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {row.packaging_category ?? ''}
                      {row.balance_quantity !== undefined && ` · ${Number(row.balance_quantity).toLocaleString()} crates`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(row.balance_quantity) > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                    {Number(row.balance_quantity) > 0 ? 'Owed' : 'Settled'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No packaging balances recorded.</p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Sales history</h2>
        {customer.sales?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Sale</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {customer.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{sale.sale_number ?? 'Draft sale'}</td>
                    <td className="py-3 pr-4">{sale.status ?? '—'}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{formatCurrency(sale.total_amount)}</td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{sale.created_at ? new Date(sale.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No sales recorded for this customer.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Payment history</h2>
        {customer.payments?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Method</th>
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {customer.payments.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{formatCurrency(entry.amount)}</td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{entry.payment_method ?? '—'}</td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{entry.reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No payments recorded.</p>
        )}
      </section>
    </div>
  )
}
