import { useEffect, useState } from 'react'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import { fetchCustomersWithFinancialSummary } from '../../customers/services/customerService'
import { formatCurrency } from '../../customers/services/index'
import type { CustomerSearchResult } from '../../customers/types/customer'
import { useNavigate } from 'react-router-dom'

export function CreditPage() {
  const { activeBusiness } = useBusiness()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!activeBusiness?.id) {
      setCustomers([])
      return
    }
    const loadCustomers = async () => {
      setError(null)
      try {
        const next = await fetchCustomersWithFinancialSummary(activeBusiness.id, search)
        setCustomers(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Customers could not be loaded.')
        setCustomers([])
      }
    }
    void loadCustomers()
  }, [activeBusiness?.id, search])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
        Customer Credit
      </h1>
      <p className="text-slate-600 dark:text-slate-300">
        Customer outstanding balances.
      </p>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
      <div className="mt-4">
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border-border px-3 py-2 dark:border-border dark:bg-background dark:text-foreground"
            placeholder="Search customers..."
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">Customer</th>
                <th className="pb-3 pr-4 font-medium">Outstanding (USD)</th>
                <th className="pb-3 pr-4 font-medium">Outstanding (ZWG)</th>
                <th className="pb-3 pr-4 font-medium">Total Sales (USD)</th>
                <th className="pb-3 pr-4 font-medium">Total Sales (ZWG)</th>
                <th className="pb-3 pr-4 font-medium">Total Payments (USD)</th>
                <th className="pb-3 pr-4 font-medium">Total Payments (ZWG)</th>
                <th className="pb-3 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {customer.full_name || customer.business_name || '—'}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(customer.current_outstanding_balance_usd)}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(customer.current_outstanding_balance_zwg)}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(customer.total_sales_usd)}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(customer.total_sales_zwg)}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(customer.total_payments_usd)}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {formatCurrency(customer.total_payments_zwg)}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="text-blue-600 underline dark:text-blue-500"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
