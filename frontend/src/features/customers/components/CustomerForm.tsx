import { useState } from 'react'
import { createCustomer, updateCustomer } from '../../customers/services/index'
import type { CustomerRecord } from '../../customers/types/customer'

type CustomerFormProps = {
  initial?: CustomerRecord | null
  businessId: string
  onSaved: () => void
  onCancel: () => void
}

export function CustomerForm({ initial, businessId, onSaved, onCancel }: CustomerFormProps) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [businessName, setBusinessName] = useState(initial?.business_name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(false)

    if (!fullName.trim()) {
      setSaving(false)
      return
    }

    setSaving(true)
    try {
      if (initial) {
        await updateCustomer({
          businessId,
          customerId: initial.id,
          fullName,
          businessName: businessName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          isActive: initial.is_active ?? true,
        })
      } else {
        await createCustomer({
          businessId,
          fullName,
          businessName: businessName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        })
      }
      onSaved()
    } catch (err) {
      console.error('Failed to save customer', err)
err instanceof Error ? err.message : 'The customer could not be saved.'
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          placeholder="Customer name"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Business name</label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          placeholder="Business name (optional)"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Phone</label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          placeholder="+263 77 123 4567"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          placeholder="Street address (optional)"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
          {saving ? 'Saving...' : 'Save customer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
        >
          Cancel
        </button>
    </div>
</form>
  )

}


