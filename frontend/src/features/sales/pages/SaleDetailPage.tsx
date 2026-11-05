import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CreditCard, Printer, Wallet } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import {
  fetchSaleDetail,
  formatCurrency,
  getSaleStatusLabel,
  makeCustomerPayment,
  refundPackagingDeposit,
} from '../services/salesService'
import type { SaleDetailRow } from '../types/sales'

const PAYMENT_OPTIONS = ['cash', 'bank_transfer', 'mobile_money']

function readRpcBalance(result: Record<string, unknown> | null | undefined): number | null {
  if (!result) {
    return null
  }

  for (const key of ['remaining_balance', 'outstanding_balance', 'balance_remaining', 'new_balance', 'balance']) {
    const value = result[key]
    if (value == null) {
      continue
    }
    const numeric = Number(value)
    if (Number.isFinite(numeric)) {
      return numeric
    }
  }

  return null
}

function isDepositHeld(status: string | null | undefined): boolean {
  const value = String(status ?? '').trim().toLowerCase()
  return value === 'held' || value === 'pending_refund' || value === 'pending' || value === 'active'
}

export function SaleDetailPage() {
  const { activeBusinessId, businesses } = useBusiness()
  const { saleId } = useParams()
  const [sale, setSale] = useState<SaleDetailRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [isRefundingDepositId, setIsRefundingDepositId] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash', reference: '' })
  const [paymentStatus, setPaymentStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [depositStatus, setDepositStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const currentBusinessRole = useMemo(() => {
    if (!activeBusinessId) {
      return null
    }

    return businesses.find((membership) => membership.business_id === activeBusinessId)?.role ?? null
  }, [activeBusinessId, businesses])

  const outstandingBalance = useMemo(() => {
    if (!sale) {
      return 0
    }

    const paidTotal = (sale.payments ?? []).reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0)
    return Math.max(Number(sale.total_amount ?? 0) - paidTotal, 0)
  }, [sale])

  const loadSale = async () => {
    if (!activeBusinessId || !saleId) {
      return
    }

    const nextSale = await fetchSaleDetail(activeBusinessId, saleId)
    setSale(nextSale)
  }

  useEffect(() => {
    if (!activeBusinessId || !saleId) {
      return
    }

    let isMounted = true

    const loadSaleData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const nextSale = await fetchSaleDetail(activeBusinessId, saleId)
        if (!isMounted) {
          return
        }
        setSale(nextSale)
      } catch (err) {
        console.error('Failed to fetch sale detail', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'The sale detail could not be loaded.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSaleData()

    return () => {
      isMounted = false
    }
  }, [activeBusinessId, saleId])

  const handleRecordPayment = async () => {
    if (!sale || !activeBusinessId || !saleId) {
      setPaymentStatus({ type: 'error', text: 'A sale is required before recording a payment.' })
      return
    }

    const amount = Number(paymentForm.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentStatus({ type: 'error', text: 'Enter a valid payment amount greater than zero.' })
      return
    }

    if (amount > outstandingBalance) {
      setPaymentStatus({ type: 'error', text: 'The payment cannot exceed the outstanding balance.' })
      return
    }

    if (!paymentForm.paymentMethod.trim()) {
      setPaymentStatus({ type: 'error', text: 'Choose a payment method.' })
      return
    }

    setIsSubmittingPayment(true)
    setPaymentStatus(null)

    try {
      const result = await makeCustomerPayment({
        businessId: activeBusinessId,
        saleId: sale.id,
        amount,
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference.trim(),
      })

      const remainingBalance = readRpcBalance(result)
      const remainingAmount = Number.isFinite(remainingBalance) ? remainingBalance : Math.max(outstandingBalance - amount, 0)

      try {
        await loadSale()
        setPaymentStatus({
          type: 'success',
          text: `Payment recorded successfully. Remaining balance: ${formatCurrency(remainingAmount)}.`,
        })
        setPaymentForm({ amount: '', paymentMethod: 'cash', reference: '' })
      } catch (refreshError) {
        console.error('Failed to refresh sale after customer payment', refreshError)
        setPaymentStatus({
          type: 'success',
          text: `Payment recorded successfully. Remaining balance: ${formatCurrency(remainingAmount)}. The displayed sale data could not refresh.`,
        })
      }
    } catch (err) {
      console.error('Failed to record customer payment', err)
      setPaymentStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'The payment could not be recorded.',
      })
    } finally {
      setIsSubmittingPayment(false)
    }
  }

  const handleRefundDeposit = async (depositId: string) => {
    if (!window.confirm('Refund this packaging deposit? This cannot be undone from the UI.')) {
      return
    }

    setIsRefundingDepositId(depositId)
    setDepositStatus(null)

    try {
      await refundPackagingDeposit(depositId)

      try {
        await loadSale()
        setDepositStatus({
          type: 'success',
          text: 'Packaging deposit refund was processed successfully.',
        })
      } catch (refreshError) {
        console.error('Failed to refresh sale after deposit refund', refreshError)
        setDepositStatus({
          type: 'success',
          text: 'Packaging deposit refund was processed successfully, but the sale details could not refresh.',
        })
      }
    } catch (err) {
      console.error('Failed to refund packaging deposit', err)
      setDepositStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'The deposit refund could not be processed.',
      })
    } finally {
      setIsRefundingDepositId(null)
    }
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Loading sale…</div>
  }

  if (error) {
    return <Alert variant="error" title="Sale detail unavailable">{error}</Alert>
  }

  if (!sale) {
    return <Alert variant="info" title="No sale found">This sale is not available in the current business.</Alert>
  }

  const canRecordPayment = sale.status === 'completed' && outstandingBalance > 0
  const canRefundDeposits = ['owner', 'administrator', 'manager'].includes((currentBusinessRole ?? '').toLowerCase())

  return (
    <div className="space-y-6">
      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sale detail</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{sale.sale_number ?? 'Draft sale'}</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {getSaleStatusLabel(sale.status)}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Customer</p>
            <p className="mt-2 font-medium text-slate-900 dark:text-white">{sale.customers ? `${sale.customers.full_name ?? ''} ${sale.customers.business_name ?? ''}`.trim() || 'Customer' : 'Unknown customer'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issued</p>
            <p className="mt-2 font-medium text-slate-900 dark:text-white">{sale.created_at ? new Date(sale.created_at).toLocaleString() : '—'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Outstanding</p>
            <p className="mt-2 font-medium text-slate-900 dark:text-white">{formatCurrency(outstandingBalance)}</p>
          </div>
        </div>
      </div>

      {canRecordPayment ? (
        <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <CreditCard className="h-5 w-5" />
            Record payment
          </div>

          {paymentStatus ? (
            <div className="mb-4">
              <Alert variant={paymentStatus.type === 'error' ? 'error' : 'success'} title={paymentStatus.type === 'error' ? 'Payment issue' : 'Payment recorded'}>{paymentStatus.text}</Alert>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 block">Amount</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <label className="block text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 block">Payment method</span>
              <select
                value={paymentForm.paymentMethod}
                onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-700 dark:text-slate-200">
              <span className="mb-1 block">Reference (optional)</span>
              <input
                type="text"
                value={paymentForm.reference}
                onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">Available balance: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(outstandingBalance)}</span></p>
            <Button type="button" variant="primary" onClick={handleRecordPayment} disabled={isSubmittingPayment} isLoading={isSubmittingPayment}>
              Record payment
            </Button>
          </div>
        </div>
      ) : null}

      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Payment history</h2>
        </div>

        {(sale.payments ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No payments have been recorded for this sale.</p>
        ) : (
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
                {(sale.payments ?? []).map((entry) => (
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
        )}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Wallet className="h-5 w-5" />
          Packaging deposits
        </div>

        {depositStatus ? (
          <div className="mb-4">
            <Alert variant={depositStatus.type === 'error' ? 'error' : 'success'} title={depositStatus.type === 'error' ? 'Deposit issue' : 'Deposit update'}>{depositStatus.text}</Alert>
          </div>
        ) : null}

        {(sale.packaging_deposits ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No packaging deposits are attached to this sale.</p>
        ) : (
          <div className="space-y-3">
            {(sale.packaging_deposits ?? []).map((deposit) => {
              const status = String(deposit.status ?? '').trim()
              const refundable = isDepositHeld(status)
              const packagingName = deposit.packaging_types?.name ?? deposit.packaging_type_name ?? 'Packaging'

              return (
                <div key={deposit.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{packagingName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Quantity: {deposit.quantity ?? 0} · Status: {status || 'Unknown'}</p>
                    </div>
                    <div className="text-right text-sm text-slate-700 dark:text-slate-200">
                      <div>Amount: {formatCurrency(deposit.amount)}</div>
                      <div>{deposit.currency ?? 'USD'}</div>
                    </div>
                  </div>

                  {refundable && canRefundDeposits ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleRefundDeposit(deposit.id)}
                        disabled={isRefundingDepositId === deposit.id}
                        isLoading={isRefundingDepositId === deposit.id}
                      >
                        Refund deposit
                      </Button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Line items</h2>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            <span className="inline-flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print receipt
            </span>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-3 pr-4 font-medium">Product</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 pr-4 font-medium">Unit price</th>
                <th className="pb-3 pr-4 font-medium">Discount</th>
                <th className="pb-3 pr-4 font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {(sale.sale_items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{item.product_name_snapshot ?? 'Product'}</td>
                  <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{item.quantity_crates ?? 0}</td>
                  <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 pr-4 text-slate-700 dark:text-slate-200">{formatCurrency(item.discount_amount)}</td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Non-fiscal receipt</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{sale.sale_number ?? 'Draft sale'}</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {getSaleStatusLabel(sale.status)}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Customer</p>
            <p className="mt-2 font-medium text-slate-900 dark:text-white">{sale.customers ? `${sale.customers.full_name ?? ''} ${sale.customers.business_name ?? ''}`.trim() || 'Customer' : 'Unknown customer'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</p>
            <p className="mt-2 font-medium text-slate-900 dark:text-white">{sale.created_at ? new Date(sale.created_at).toLocaleString() : '—'}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-200">
          {(sale.sale_items ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <span>{item.product_name_snapshot ?? 'Product'} × {item.quantity_crates ?? 0}</span>
              <span>{formatCurrency(item.line_total)}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
            <span>Discount</span>
            <span>{formatCurrency(sale.discount_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
            <span>Total</span>
            <span>{formatCurrency(sale.total_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
            <span>Outstanding balance</span>
            <span>{formatCurrency(outstandingBalance)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
