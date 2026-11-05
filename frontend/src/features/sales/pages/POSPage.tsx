import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, ReceiptText, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useAuth } from '../../auth/hooks/useAuth'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import type { CustomerRecord, PackagingDepositEntry, SaleCartItem, SaleVariantOption } from '../types/sales'
import {
  buildPackagingReturnEntries,
  calculateLineTotals,
  canCompleteSaleWithException,
  completeSale,
  createDraftSale,
  fetchCustomersForBusiness,
  fetchProductVariantsForSale,
  fetchWalkInCustomer,
  formatCurrency,
  getCustomerDisplayName,
  insertSaleItems,
} from '../services/salesService'

const PAYMENT_OPTIONS = ['cash', 'bank_transfer', 'mobile_money']

export function POSPage() {
  const { activeBusinessId, businesses } = useBusiness()
  const { user } = useAuth()
  const [catalogue, setCatalogue] = useState<SaleVariantOption[]>([])
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<SaleCartItem[]>([])
  const [packagingReturns, setPackagingReturns] = useState<Record<string, number>>({})
  const [exceptionMode, setExceptionMode] = useState<'packaging_owed' | ''>('')
  const [exceptionReason, setExceptionReason] = useState('')
  const [initialPayment, setInitialPayment] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const filteredCatalogue = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return catalogue
    }

    return catalogue.filter((item) => {
      const haystack = [
        item.product_name,
        item.brand,
        item.variant_name,
        item.flavour,
        item.bottle_size_ml ? `${item.bottle_size_ml}ml` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [catalogue, searchTerm])

  useEffect(() => {
    if (!activeBusinessId) {
      return
    }

    let isMounted = true

    const loadPosData = async () => {
      setIsLoading(true)
      try {
        const [nextVariants, nextCustomers] = await Promise.all([
          fetchProductVariantsForSale(activeBusinessId),
          fetchCustomersForBusiness(activeBusinessId),
        ])

        if (!isMounted) {
          return
        }

        setCatalogue(nextVariants)
        setCustomers(nextCustomers)

        const preferredWalkIn = await fetchWalkInCustomer(activeBusinessId)
        if (!isMounted) {
          return
        }

        const nextSelectedCustomerId = preferredWalkIn?.id ?? nextCustomers[0]?.id ?? null
        setSelectedCustomerId((current) => current ?? nextSelectedCustomerId)
      } catch (error) {
        console.error('Failed to load POS data', error)
        if (isMounted) {
          setStatus({ type: 'error', text: error instanceof Error ? error.message : 'The sales catalogue and customer list could not be loaded.' })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadPosData()

    return () => {
      isMounted = false
    }
  }, [activeBusinessId])

  const cartByVariant = useMemo(() => {
    return new Map(catalogue.map((item) => [item.id, item]))
  }, [catalogue])

  const packagingSummary = useMemo(() => {
    const totals = new Map<string, { packaging_type_id: string; packaging_type_name: string | null; packaging_category: string | null; quantity_required: number }>()

    for (const item of cart) {
      const variant = cartByVariant.get(item.variantId)
      if (!variant) {
        continue
      }

      for (const requirement of variant.packaging_requirements) {
        const existing = totals.get(requirement.packaging_type_id) ?? {
          packaging_type_id: requirement.packaging_type_id,
          packaging_type_name: requirement.packaging_type_name,
          packaging_category: requirement.packaging_category,
          quantity_required: 0,
        }

        existing.quantity_required += requirement.quantity_required * item.quantity
        totals.set(requirement.packaging_type_id, existing)
      }
    }

    return Array.from(totals.values())
  }, [cart, cartByVariant])

  const minicartTotals = useMemo(() => {
    const lines = calculateLineTotals(
      cart.map((item) => ({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discount: item.discount,
      })),
    )

    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
    const discount = lines.reduce((sum, line) => sum + line.discountAmount, 0)
    const total = Math.max(subtotal - discount, 0)

    return { subtotal, discount, total }
  }, [cart])

  const shortageCount = useMemo(() => {
    return packagingSummary.reduce((sum, requirement) => {
      const returned = Number(packagingReturns[requirement.packaging_type_id] ?? requirement.quantity_required)
      return sum + (requirement.quantity_required > returned ? 1 : 0)
    }, 0)
  }, [packagingReturns, packagingSummary])

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null

  const addToCart = (variant: SaleVariantOption) => {
    const existing = cart.find((item) => item.variantId === variant.id)
    const currentQuantity = existing?.quantity ?? 0
    const nextQuantity = currentQuantity + 1

    if (nextQuantity > (variant.stock_on_hand ?? 0)) {
      setStatus({ type: 'error', text: `Only ${variant.stock_on_hand} crates are available for this variant.` })
      return
    }

    if (existing) {
      setCart((current) =>
        current.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: Math.min(item.quantity + 1, variant.stock_on_hand) }
            : item,
        ),
      )
      return
    }

    setCart((current) => [
      ...current,
      {
        variantId: variant.id,
        productName: variant.product_name ?? 'Unknown product',
        variantLabel: [variant.variant_name, variant.flavour, variant.bottle_size_ml ? `${variant.bottle_size_ml}ml` : null]
          .filter(Boolean)
          .join(' · '),
        unitPrice: variant.current_price ?? 0,
        quantity: 1,
        discount: 0,
        stockOnHand: variant.stock_on_hand,
      },
    ])
  }

  const updateCartQuantity = (variantId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.variantId !== variantId) {
            return item
          }

          const nextQuantity = item.quantity + delta
          return { ...item, quantity: Math.max(nextQuantity, 0) }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  const updateCartDiscount = (variantId: string, nextDiscount: number) => {
    setCart((current) =>
      current.map((item) =>
        item.variantId === variantId
          ? { ...item, discount: Math.max(0, Number.isFinite(nextDiscount) ? nextDiscount : 0) }
          : item,
      ),
    )
  }

  const removeFromCart = (variantId: string) => {
    setCart((current) => current.filter((item) => item.variantId !== variantId))
  }

  const resetCheckout = () => {
    setCart([])
    setInitialPayment(0)
    setPaymentMethod('cash')
    setExceptionReason('')
    setExceptionMode('')
    setPackagingReturns({})
  }

  const handleSubmit = async () => {
    if (!activeBusinessId) {
      setStatus({ type: 'error', text: 'Select a business before completing a sale.' })
      return
    }

    if (!cart.length) {
      setStatus({ type: 'error', text: 'Add at least one product to the cart.' })
      return
    }

    if (!selectedCustomerId) {
      setStatus({ type: 'error', text: 'Select a registered customer or use the Walk-in Customer option.' })
      return
    }

    if (!user?.id) {
      setStatus({ type: 'error', text: 'You must be signed in to complete a sale.' })
      return
    }

    if (initialPayment < 0 || initialPayment > minicartTotals.total) {
      setStatus({ type: 'error', text: 'The initial payment must be between zero and the sale total.' })
      return
    }

    if (initialPayment > 0 && !paymentMethod.trim()) {
      setStatus({ type: 'error', text: 'Choose a payment method when an initial payment is entered.' })
      return
    }

    const packagingRules = packagingSummary
    const shortages = packagingRules.filter((requirement) => {
      const returned = Number(packagingReturns[requirement.packaging_type_id] ?? requirement.quantity_required)
      return requirement.quantity_required > returned
    })

    if (shortages.length > 0 && !exceptionMode) {
      setStatus({ type: 'error', text: 'A packaging shortage requires an explicit exception mode.' })
      return
    }

    if (shortages.length > 0 && (!exceptionReason || !exceptionReason.trim())) {
      setStatus({ type: 'error', text: 'Explain the packaging shortage before completing the sale.' })
      return
    }

    const currentMembership = businesses.find((membership) => membership.business_id === activeBusinessId) ?? null
    const isAuthorizedForException = canCompleteSaleWithException(currentMembership?.role)

    if (shortages.length > 0 && !isAuthorizedForException) {
      setStatus({
        type: 'error',
        text: 'Packaging exceptions require owner, administrator, or manager authorization.',
      })
      return
    }

    const packagingReturned = buildPackagingReturnEntries(
      packagingSummary.map((entry) => ({ packaging_type_id: entry.packaging_type_id, quantity_required: entry.quantity_required })),
      packagingReturns,
    )

    // NOTE: packaging_deposits.amount is a USD monetary amount, not a crate
    // quantity. No packaging-deposit rate is currently configured in this
    // codebase, so the "deposit" exception mode is disabled until a deposit
    // rate (and its `currency`) is configured. This preserves the
    // `packaging_owed` flow for authorized users.
    const deposits: PackagingDepositEntry[] = []

    try {
      setIsSubmitting(true)
      setStatus(null)

      const sale = await createDraftSale({
        businessId: activeBusinessId,
        customerId: selectedCustomerId,
        subtotal: minicartTotals.subtotal,
        discountAmount: minicartTotals.discount,
        totalAmount: minicartTotals.total,
        createdBy: user.id,
      })

      await insertSaleItems(
        activeBusinessId,
        sale.id,
        cart.map((item) => {
          const price = Number(item.unitPrice) || 0
          const quantity = Number(item.quantity) || 0
          const discount = Number(item.discount) || 0
          const subtotal = price * quantity
          const lineDiscount = Math.min(discount, subtotal)
          const total = Math.max(subtotal - lineDiscount, 0)

          return {
            product_variant_id: item.variantId,
            product_name_snapshot: item.productName,
            variant_name_snapshot: item.variantLabel,
            quantity_crates: quantity,
            unit_price: price,
            discount_amount: lineDiscount,
            line_total: total,
          }
        }),
      )

      const rpcResult = await completeSale({
        saleId: sale.id,
        packagingReturned,
        exceptionMode: shortages.length > 0 ? exceptionMode : null,
        exceptionReason: shortages.length > 0 ? exceptionReason.trim() : null,
        deposits,
        initialPayment,
        paymentMethod: initialPayment > 0 ? paymentMethod : null,
      })

      setStatus({
        type: 'success',
        text: `Sale ${rpcResult.sale_number ?? sale.sale_number ?? 'completed'} was completed successfully.`,
      })

      resetCheckout()
    } catch (error) {
      console.error('Failed to complete sale', error)
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'The sale could not be completed.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Point of sale</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Sales checkout</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/sales"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Sales history
          </Link>
        </div>
      </div>

      {status ? <Alert variant={status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : 'info'} title={status.type === 'error' ? 'Action required' : status.type === 'success' ? 'Sale completed' : 'POS update'}>{status.text}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search products"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products, flavour, bottle size"
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
              Loading product catalogue…
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredCatalogue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300 md:col-span-2">
                  No active variants are available for sale in this business.
                </div>
              ) : (
                filteredCatalogue.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => addToCart(variant)}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-primary hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-500"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{variant.product_name ?? 'Unknown product'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{variant.brand ?? 'No brand'}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        {variant.stock_on_hand ?? 0} crates
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                      <p>{variant.variant_name ?? 'Variant'} · {variant.flavour ?? 'No flavour'}</p>
                      <p>{variant.bottle_size_ml ? `${variant.bottle_size_ml} ml` : 'Bottle size not set'}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Price</p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{formatCurrency(variant.current_price)}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cart</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Current sale</h2>
            </div>
          </div>

          <div className="space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300">
                No items added yet.
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.variantId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.productName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.variantLabel}</p>
                    </div>
                    <button type="button" onClick={() => removeFromCart(item.variantId)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label={`Remove ${item.productName}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => updateCartQuantity(item.variantId, -1)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-slate-600">-</button>
                    <span className="min-w-8 text-center text-sm font-medium text-slate-900 dark:text-white">{item.quantity}</span>
                    <button type="button" onClick={() => updateCartQuantity(item.variantId, 1)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-slate-600">+</button>
                  </div>

                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-sm">
                    <span className="text-slate-500">Discount</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.discount}
                      onChange={(event) => updateCartDiscount(item.variantId, Number(event.target.value) || 0)}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Line total</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(item.unitPrice * item.quantity - item.discount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Customer</span>
              <select
                value={selectedCustomerId ?? ''}
                onChange={(event) => setSelectedCustomerId(event.target.value || null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{getCustomerDisplayName(customer)}</option>
                ))}
              </select>
            </label>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedCustomer ? getCustomerDisplayName(selectedCustomer) : 'No customer selected'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(minicartTotals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span>{formatCurrency(minicartTotals.discount)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
                <span>Total</span>
                <span>{formatCurrency(minicartTotals.total)}</span>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <ReceiptText className="h-4 w-4" />
                Packaging return
              </div>

              {packagingSummary.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No packaging requirements for this cart.</p>
              ) : (
                packagingSummary.map((requirement) => {
                  const returned = Number(packagingReturns[requirement.packaging_type_id] ?? requirement.quantity_required)
                  const shortage = Math.max(requirement.quantity_required - returned, 0)

                  return (
                    <div key={requirement.packaging_type_id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{requirement.packaging_type_name ?? 'Packaging'}</span>
                        <span className="text-slate-500">Required {requirement.quantity_required}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={requirement.quantity_required}
                        value={returned}
                        onChange={(event) =>
                          setPackagingReturns((current) => ({
                            ...current,
                            [requirement.packaging_type_id]: Number(event.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      {shortage > 0 ? <p className="text-[11px] text-amber-700">Shortage: {shortage} crates. Select an exception mode to continue.</p> : null}
                    </div>
                  )
                })
              )}

              {shortageCount > 0 ? (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-600/30 dark:bg-amber-950/20 dark:text-amber-200">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">Exception mode</span>
                    <select
                      value={exceptionMode}
                      onChange={(event) => setExceptionMode(event.target.value as 'packaging_owed' | '')}
                      className="w-full rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm text-amber-900 dark:border-amber-600 dark:bg-slate-900 dark:text-amber-100"
                    >
                      <option value="">Select exception</option>
                      <option value="packaging_owed">Packaging owed</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em]">Reason</span>
                    <textarea
                      value={exceptionReason}
                      onChange={(event) => setExceptionReason(event.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-amber-300 bg-white px-2 py-2 text-sm text-amber-900 dark:border-amber-600 dark:bg-slate-900 dark:text-amber-100"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <CreditCard className="h-4 w-4" />
                Payment details
              </div>

              <label className="block text-sm text-slate-700 dark:text-slate-200">
                <span className="mb-1 block">Initial payment</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={initialPayment}
                  onChange={(event) => setInitialPayment(Number(event.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block text-sm text-slate-700 dark:text-slate-200">
                <span className="mb-1 block">Payment method</span>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>Outstanding balance</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(Math.max(minicartTotals.total - initialPayment, 0))}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={resetCheckout}>
                Clear
              </Button>
              <Button disabled={isSubmitting} className="flex-1" onClick={handleSubmit}>
                {isSubmitting ? 'Completing…' : 'Complete sale'}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
