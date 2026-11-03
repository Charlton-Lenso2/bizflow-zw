import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useBusiness } from '../hooks/useActiveBusiness'

export function BusinessOnboardingPage() {
  const navigate = useNavigate()
  const { createBusiness } = useBusiness()
  const [name, setName] = useState('')
  const [businessType, setBusinessType] = useState('wholesale')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'ZWG'>('USD')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const createdBusiness = await createBusiness({
        name,
        business_type: businessType,
        phone,
        address,
        default_currency: defaultCurrency,
      })

      if (!createdBusiness) {
        setError('You must be signed in to create a business.')
        return
      }

      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Business creation failed. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Setup</p>
          <h1 className="text-2xl font-bold text-slate-900">Create your business</h1>
          <p className="text-sm text-slate-600">
            Start by registering the business that will own your sales, customers and ledger data.
          </p>
        </div>

        {error ? (
          <div className="mb-5">
            <Alert variant="error" title="Unable to create business">
              {error}
            </Alert>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Business name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Simba Wholesale"
            required
          />

          <Input
            label="Business type"
            value={businessType}
            onChange={(event) => setBusinessType(event.target.value)}
            placeholder="wholesale"
            required
          />

          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+263 ..."
          />

          <Input
            label="Address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Physical address"
          />

          <label className="block space-y-2 text-sm text-slate-700">
            <span className="font-medium text-slate-700">Default currency</span>
            <select
              value={defaultCurrency}
              onChange={(event) => setDefaultCurrency(event.target.value as 'USD' | 'ZWG')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="USD">USD</option>
              <option value="ZWG">ZWG</option>
            </select>
          </label>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Create business
          </Button>
        </form>
      </div>
    </div>
  )
}
