import { useEffect, useMemo, useState } from 'react'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import { fetchAllCustomersForBusiness } from '../services/customerService'
import { CustomerList } from '../components/CustomerList'
import { CustomerForm } from '../components/CustomerForm'
import { CustomerDetail } from '../components/CustomerDetail'
import type { CustomerRecord, CustomerFilterStatus } from '../../customers/types/customer'

export function CustomerDirectoryPage() {
  const { activeBusinessId } = useBusiness()

  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<{ status: CustomerFilterStatus; search: string }>({ status: 'all', search: '' })
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadCustomers = async () => {
      if (!activeBusinessId) {
        setCustomers([])
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const next = await fetchAllCustomersForBusiness(activeBusinessId)
        if (!isMounted) return
        setCustomers(next)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'The customer list could not be loaded.')
        setCustomers([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void loadCustomers()
    return () => {
      isMounted = false
    }
  }, [activeBusinessId])

  const handleFilterChange = (status: CustomerFilterStatus, search: string) => {
    setFilters(() => ({ status, search }))
  }

  const handleView = (customer: CustomerRecord) => {
    setSelectedCustomer(customer)
  }

  const handleEdit = (customer: CustomerRecord) => {
    setEditingCustomer(customer)
    setFormOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setEditingCustomer(null)
  }

  const handleFormSaved = async () => {
    setFormOpen(false)
    setEditingCustomer(null)
    setStatus({ type: 'success', text: 'Customer saved.' })
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(true)
    setError(null)
    try {
      if (!activeBusinessId) {
        setError('Select a business before accessing customers.')
        return
      }
      const next = await fetchAllCustomersForBusiness(activeBusinessId)
      setCustomers(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The customer list could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
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
  }, [customers, filters.status, filters.search])

  const handleAddCustomer = () => {
    setSelectedCustomer(null)
    setEditingCustomer(null)
    setFormOpen(true)
  }

  if (loading && customers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Loading customers…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Customers</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Customer directory</h1>
        </div>
        <button
          type="button"
          onClick={handleAddCustomer}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          Add customer
        </button>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

      {status ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{status.text}</p> : null}

      <CustomerList
        customers={filtered}
        filters={filters}
        onFilterChange={handleFilterChange}
        onView={handleView}
        onEdit={handleEdit}
      />

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <CustomerForm
              initial={editingCustomer ?? selectedCustomer}
              businessId={activeBusinessId ?? ''}
              onSaved={handleFormSaved}
              onCancel={handleFormClose}
            />
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Customer detail</h2>
              <button type="button" onClick={() => setSelectedCustomer(null)} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                Close
              </button>
            </div>
            <CustomerDetail customer={selectedCustomer} />
          </div>
        </div>
      )}
    </div>
  )
}
