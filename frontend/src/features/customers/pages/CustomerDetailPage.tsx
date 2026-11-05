import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import { fetchCustomerById } from '../services/customerService'
import { CustomerDetail } from '../components/CustomerDetail'
import type { CustomerDetailRow } from '../../customers/types/customer'

export function CustomerDetailPage() {
  const { activeBusinessId } = useBusiness()
  const { customerId } = useParams<{ customerId: string }>()

  const [customer, setCustomer] = useState<CustomerDetailRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeBusinessId || !customerId) {
      return
    }
    let isMounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const next = await fetchCustomerById(activeBusinessId, customerId)
        if (!isMounted) return
        setCustomer(next)
      } catch (err) {
        console.error('Failed to load customer', err)
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'The customer detail could not be loaded.')
        setCustomer(null)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [activeBusinessId, customerId])

  if (loading && !customer) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Loading customer…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        This customer is not available in the current business.
      </div>
    )
  }

  return <CustomerDetail customer={customer} />
}
