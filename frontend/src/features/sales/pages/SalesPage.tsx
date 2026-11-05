import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Input } from '../../../components/ui/Input'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import { fetchSalesForBusiness, formatCurrency, getSaleStatusLabel } from '../services/salesService'
import type { SaleRow } from '../types/sales'

export function SalesPage() {
  const { activeBusinessId } = useBusiness()
  const [sales, setSales] = useState<SaleRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState<{ type: 'error' | 'info'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!activeBusinessId) {
      return
    }

    let isMounted = true

    const loadSales = async () => {
      setIsLoading(true)
      try {
        const nextSales = await fetchSalesForBusiness(activeBusinessId)
        if (!isMounted) {
          return
        }

        setSales(nextSales)
      } catch (error) {
        console.error('Failed to load sales history', error)
        if (isMounted) {
          setStatus({ type: 'error', text: error instanceof Error ? error.message : 'The sales history could not be loaded.' })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSales()

    return () => {
      isMounted = false
    }
  }, [activeBusinessId])

  const filteredSales = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return sales
    }

    return sales.filter((sale) => {
      const customerName = sale.customers ? `${sale.customers.full_name ?? ''} ${sale.customers.business_name ?? ''}` : ''
      const haystack = [sale.sale_number, customerName, sale.status, sale.currency].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [sales, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sales</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Sales history</h1>
        </div>
        <Link
          to="/pos"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          New POS sale
        </Link>
      </div>

      {status ? <Alert variant="error" title="Sales loading issue">{status.text}</Alert> : null}

      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Search sales"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search sale number or customer"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
            Loading sales history…
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
            No sales found for this business.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Sale</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="align-top">
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                      <Link to={`/sales/${sale.id}`} className="hover:text-brand-primary">{sale.sale_number ?? 'Draft sale'}</Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {sale.customers ? `${sale.customers.full_name ?? 'Customer'} ${sale.customers.business_name ?? ''}`.trim() : 'Unknown customer'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">
                      {sale.created_at ? new Date(sale.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {getSaleStatusLabel(sale.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{formatCurrency(sale.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
