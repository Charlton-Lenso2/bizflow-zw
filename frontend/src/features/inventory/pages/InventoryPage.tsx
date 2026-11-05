import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowUpCircle, Boxes, ClipboardList, PackageSearch, TrendingDown, TrendingUp } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { LoadingState } from '../../../components/ui/LoadingState'
import { BusinessSelector } from '../../business/components/BusinessSelector'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import {
  canManageInventory,
  fetchInventoryOverview,
  fetchMovementHistory,
  formatMovementEffect,
  getMovementSummaryText,
  getMotionDirectionLabel,
  getVariantSummaryLabel,
  hasOpeningStockRecord,
  recordOpeningStock,
  recordStockAdjustment,
  MOVEMENT_LABELS,
} from '../services/inventoryService'
import type { InventoryMovementRow, InventoryOverview } from '../types/inventory'

const statusOptions = [
  { value: 'all', label: 'All stock status' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'low-stock', label: 'Low stock' },
  { value: 'out-of-stock', label: 'Out of stock' },
] as const

const movementTypeOptions = [
  { value: 'all', label: 'All movement types' },
  ...Object.entries(MOVEMENT_LABELS).map(([value, label]) => ({ value, label })),
] as const

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'No movement yet'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unavailable'
  }

  return parsed.toLocaleString()
}

export function InventoryPage() {
  const { activeBusinessId, businesses, activeBusiness } = useBusiness()
  const currentMembership = businesses.find((membership) => membership.business_id === activeBusinessId) ?? null
  const canWriteInventory = canManageInventory(currentMembership?.role)

  const [overview, setOverview] = useState<InventoryOverview | null>(null)
  const [movements, setMovements] = useState<InventoryMovementRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [stockSearchTerm, setStockSearchTerm] = useState('')
  const [movementSearchTerm, setMovementSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]['value']>('all')
  const [movementFilter, setMovementFilter] = useState<(typeof movementTypeOptions)[number]['value']>('all')
  const [movementVariantFilter, setMovementVariantFilter] = useState<string>('all')
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [openingForm, setOpeningForm] = useState<{ variantId: string; quantity: string; notes: string }>({
    variantId: '',
    quantity: '',
    notes: '',
  })
  const [adjustmentForm, setAdjustmentForm] = useState<{
    variantId: string
    direction: 'increase' | 'decrease'
    quantity: string
    notes: string
  }>({
    variantId: '',
    direction: 'increase',
    quantity: '',
    notes: '',
  })
  const [isSubmittingOpening, setIsSubmittingOpening] = useState(false)
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false)
  const [isOpeningConfirmationVisible, setIsOpeningConfirmationVisible] = useState(false)
  const [isAdjustmentConfirmationVisible, setIsAdjustmentConfirmationVisible] = useState(false)
  const previousBusinessIdRef = useRef<string | null>(null)
  const openingFormSnapshotRef = useRef(openingForm)
  const adjustmentFormSnapshotRef = useRef(adjustmentForm)

  useEffect(() => {
    const previousBusinessId = previousBusinessIdRef.current
    if (previousBusinessId !== activeBusinessId) {
      previousBusinessIdRef.current = activeBusinessId
      queueMicrotask(() => {
        setSuccessMessage(null)
        setMovementVariantFilter('all')
        setIsOpeningConfirmationVisible(false)
        setIsAdjustmentConfirmationVisible(false)
      })
    }
  }, [activeBusinessId])

  useEffect(() => {
    if (
      isOpeningConfirmationVisible &&
      (openingForm.variantId !== openingFormSnapshotRef.current.variantId ||
        openingForm.quantity !== openingFormSnapshotRef.current.quantity ||
        openingForm.notes !== openingFormSnapshotRef.current.notes)
    ) {
      setIsOpeningConfirmationVisible(false)
    }

    openingFormSnapshotRef.current = openingForm
  }, [isOpeningConfirmationVisible, openingForm])

  useEffect(() => {
    if (
      isAdjustmentConfirmationVisible &&
      (adjustmentForm.variantId !== adjustmentFormSnapshotRef.current.variantId ||
        adjustmentForm.direction !== adjustmentFormSnapshotRef.current.direction ||
        adjustmentForm.quantity !== adjustmentFormSnapshotRef.current.quantity ||
        adjustmentForm.notes !== adjustmentFormSnapshotRef.current.notes)
    ) {
      setIsAdjustmentConfirmationVisible(false)
    }

    adjustmentFormSnapshotRef.current = adjustmentForm
  }, [adjustmentForm, isAdjustmentConfirmationVisible])

  const loadInventory = useCallback(async (options?: { suppressError?: boolean }): Promise<boolean> => {
    if (!activeBusinessId) {
      setOverview(null)
      setMovements([])
      setSelectedVariantId(null)
      return true
    }

    setIsLoading(true)
    if (!options?.suppressError) {
      setErrorMessage(null)
    }

    try {
      const [nextOverview, nextMovements] = await Promise.all([
        fetchInventoryOverview(activeBusinessId),
        fetchMovementHistory(activeBusinessId),
      ])

      setOverview(nextOverview)
      setMovements(nextMovements)
      setSelectedVariantId((current) => {
        if (current && nextOverview.rows.some((row) => row.id === current)) {
          return current
        }

        return nextOverview.rows[0]?.id ?? null
      })
      setIsOpeningConfirmationVisible(false)
      setIsAdjustmentConfirmationVisible(false)
      return true
    } catch (error) {
      console.error('Failed to load inventory', error)
      setOverview(null)
      setMovements([])
      setSelectedVariantId(null)
      if (!options?.suppressError) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load inventory for this business.')
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }, [activeBusinessId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadInventory()
  }, [loadInventory])

  const filteredRows = useMemo(() => {
    if (!overview) {
      return []
    }

    return overview.rows.filter((row) => {
      const matchesSearch =
        !stockSearchTerm ||
        `${row.product_name} ${row.variant_name ?? ''} ${row.flavour ?? ''} ${row.brand ?? ''}`
          .toLowerCase()
          .includes(stockSearchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || row.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [overview, stockSearchTerm, statusFilter])

  const filteredMovements = useMemo(() => {
    const base =
      movementVariantFilter === 'all'
        ? movements
        : movements.filter((row) => row.product_variant_id === movementVariantFilter)

    return base.filter((row) => {
      const matchesType = movementFilter === 'all' || row.movement_type === movementFilter
      const matchesSearch =
        !movementSearchTerm ||
        `${row.product_name} ${row.variant_name ?? ''} ${row.flavour ?? ''} ${row.notes ?? ''}`
          .toLowerCase()
          .includes(movementSearchTerm.toLowerCase())

      return matchesType && matchesSearch
    })
  }, [movementFilter, movementSearchTerm, movementVariantFilter, movements])

  const selectedVariant = overview?.rows.find((row) => row.id === selectedVariantId) ?? null
  const selectedVariantMovements = useMemo(
    () => (selectedVariantId ? movements.filter((row) => row.product_variant_id === selectedVariantId) : []),
    [movements, selectedVariantId],
  )

  const adjustmentPreview = useMemo(() => {
    const selectedAdjustmentVariant = overview?.rows.find((row) => row.id === adjustmentForm.variantId) ?? null
    if (!selectedAdjustmentVariant) {
      return null
    }

    const quantity = Number(adjustmentForm.quantity || 0)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return null
    }

    const direction = adjustmentForm.direction
    const delta = direction === 'increase' ? quantity : -quantity
    const nextBalance = selectedAdjustmentVariant.quantity_crates + delta

    return {
      direction,
      quantity,
      currentBalance: selectedAdjustmentVariant.quantity_crates,
      nextBalance,
      wouldBeNegative: nextBalance < 0,
      productName: selectedAdjustmentVariant.product_name,
      variantLabel: getVariantSummaryLabel(
        selectedAdjustmentVariant.variant_name,
        selectedAdjustmentVariant.flavour,
        selectedAdjustmentVariant.bottle_size_ml,
      ),
      label: direction === 'increase' ? `Increase by ${quantity} crates` : `Decrease by ${quantity} crates`,
    }
  }, [adjustmentForm, overview])

  const handleOpeningStockSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeBusinessId) {
      setErrorMessage('Select a business before recording opening stock.')
      return
    }

    if (!openingForm.variantId) {
      setErrorMessage('Choose a product variant before recording opening stock.')
      return
    }

    const quantity = Number(openingForm.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setErrorMessage('Opening stock quantity must be a positive whole number.')
      return
    }

    if (!isOpeningConfirmationVisible) {
      setErrorMessage(null)
      setIsOpeningConfirmationVisible(true)
      return
    }

    setIsSubmittingOpening(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      if (await hasOpeningStockRecord(activeBusinessId, openingForm.variantId)) {
        throw new Error('Opening stock has already been recorded for this variant. Use a stock adjustment for later corrections.')
      }

      await recordOpeningStock(activeBusinessId, openingForm.variantId, quantity, openingForm.notes)
      setOpeningForm({ variantId: '', quantity: '', notes: '' })
      setIsOpeningConfirmationVisible(false)
      setErrorMessage(null)
      const refreshSucceeded = await loadInventory({ suppressError: true })
      if (refreshSucceeded) {
        setSuccessMessage('Opening stock recorded successfully.')
      } else {
        setSuccessMessage('Opening stock recorded successfully. The inventory could not be refreshed right now, but the movement was saved.')
      }
    } catch (error) {
      console.error('Opening stock save failed', error)
      setErrorMessage(error instanceof Error ? error.message : 'The opening stock could not be recorded.')
    } finally {
      setIsSubmittingOpening(false)
    }
  }

  const handleAdjustmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeBusinessId) {
      setErrorMessage('Select a business before making a stock adjustment.')
      return
    }

    if (!adjustmentForm.variantId) {
      setErrorMessage('Choose a product variant before creating a stock adjustment.')
      return
    }

    const quantity = Number(adjustmentForm.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setErrorMessage('Adjustment quantity must be a positive whole number.')
      return
    }

    const currentVariant = overview?.rows.find((row) => row.id === adjustmentForm.variantId) ?? null
    const currentBalance = currentVariant?.quantity_crates ?? 0
    const nextBalance = adjustmentForm.direction === 'increase' ? currentBalance + quantity : currentBalance - quantity

    if (nextBalance < 0) {
      setErrorMessage(`This decrease would push stock below zero. Current stock is ${currentBalance} crates.`)
      return
    }

    if (!adjustmentForm.notes?.trim()) {
      setErrorMessage('A reason is required for every stock adjustment.')
      return
    }

    if (!isAdjustmentConfirmationVisible) {
      setErrorMessage(null)
      setIsAdjustmentConfirmationVisible(true)
      return
    }

    setIsSubmittingAdjustment(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      await recordStockAdjustment(
        activeBusinessId,
        adjustmentForm.variantId,
        adjustmentForm.direction,
        quantity,
        adjustmentForm.notes,
      )

      setAdjustmentForm({ variantId: '', direction: 'increase', quantity: '', notes: '' })
      setIsAdjustmentConfirmationVisible(false)
      setErrorMessage(null)
      const refreshSucceeded = await loadInventory({ suppressError: true })
      if (refreshSucceeded) {
        setSuccessMessage('Stock adjustment recorded successfully.')
      } else {
        setSuccessMessage('Stock adjustment recorded successfully. The inventory could not be refreshed right now, but the movement was saved.')
      }
    } catch (error) {
      console.error('Stock adjustment failed', error)
      setErrorMessage(error instanceof Error ? error.message : 'The stock adjustment could not be recorded.')
    } finally {
      setIsSubmittingAdjustment(false)
    }
  }

  if (!activeBusinessId) {
    return (
      <div className="space-y-6">
        <BusinessSelector />
        <Alert variant="info" title="No active business selected">
          Pick a business from the selector to view inventory and stock movements.
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingState message="Loading inventory and stock movements..." />
  }

  const variantOptions = overview?.rows ?? []

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Operations</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Inventory</h1>
        </div>
        <div className="w-full max-w-md md:w-auto">
          <BusinessSelector />
        </div>
      </header>

      {errorMessage ? <Alert variant="error" title="Inventory unavailable">{errorMessage}</Alert> : null}
      {successMessage ? <Alert variant="success" title="Saved">{successMessage}</Alert> : null}

      {activeBusiness ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
          <span className="font-semibold text-slate-900 dark:text-white">{activeBusiness.name}</span>
          <span className="ml-2 text-slate-500 dark:text-slate-400">Business stock overview</span>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>Tracked variants</span>
            <Boxes className="h-4 w-4" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-slate-900 dark:text-white">{overview ? overview.totalVariants : '—'}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-900/20">
          <div className="flex items-center justify-between text-sm text-emerald-700 dark:text-emerald-300">
            <span>Total crates</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-emerald-900 dark:text-emerald-100">{overview ? overview.totalCrates : '—'}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800/60 dark:bg-amber-900/20">
          <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300">
            <span>Low stock</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-amber-900 dark:text-amber-100">{overview ? overview.lowStockCount : '—'}</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-800/60 dark:bg-red-900/20">
          <div className="flex items-center justify-between text-sm text-red-700 dark:text-red-300">
            <span>Out of stock</span>
            <TrendingDown className="h-4 w-4" />
          </div>
          <p className="mt-5 text-3xl font-semibold text-red-900 dark:text-red-100">{overview ? overview.outOfStockCount : '—'}</p>
        </div>
      </section>

      {!isLoading && errorMessage === null && overview !== null && overview.rows.length === 0 ? (
        <Alert variant="info" title="No stock recorded yet">
          This business has no stock balances. Record opening stock to begin tracking inventory.
        </Alert>
      ) : null}

      {overview && overview.rows.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Stock ledger</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Inventory overview</h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label="Search stock"
                  value={stockSearchTerm}
                  onChange={(event) => setStockSearchTerm(event.target.value)}
                  placeholder="Search stock"
                  className="min-w-[180px]"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as (typeof statusOptions)[number]['value'])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-700">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className="pb-3 pr-3 font-medium">Product</th>
                    <th className="pb-3 pr-3 font-medium">Variant</th>
                    <th className="pb-3 pr-3 font-medium">Stock</th>
                    <th className="pb-3 pr-3 font-medium">Status</th>
                    <th className="pb-3 pr-3 font-medium">Last movement</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className={selectedVariantId === row.id ? 'bg-slate-50 dark:bg-slate-800/80' : undefined}>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900 dark:text-white">{row.product_name}</div>
                        {row.brand ? <div className="text-xs text-slate-500 dark:text-slate-400">{row.brand}</div> : null}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {getVariantSummaryLabel(row.variant_name, row.flavour, row.bottle_size_ml)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{row.quantity_crates} crates</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            row.status === 'in-stock'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : row.status === 'low-stock'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                          }`}
                        >
                          {row.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-sm text-slate-500 dark:text-slate-400">{formatDateTime(row.last_movement_at)}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" onClick={() => setSelectedVariantId(row.id)} className="px-3 py-1.5 text-xs">
                            View
                          </Button>
                          {canWriteInventory ? (
                            <Button type="button" variant="secondary" onClick={() => setAdjustmentForm({ variantId: row.id, direction: 'increase', quantity: '', notes: '' })} className="px-3 py-1.5 text-xs">
                              Adjust
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <PackageSearch className="h-4 w-4" />
                <h3 className="text-base font-semibold">Stock detail</h3>
              </div>

              {selectedVariant ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Product</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{selectedVariant.product_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Variant</p>
                    <p className="text-base text-slate-800 dark:text-slate-100">
                      {getVariantSummaryLabel(selectedVariant.variant_name, selectedVariant.flavour, selectedVariant.bottle_size_ml)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Current stock</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{selectedVariant.quantity_crates} crates</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Recent movements</p>
                    {selectedVariantId ? (
                      selectedVariantMovements.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {selectedVariantMovements.slice(0, 5).map((movement) => (
                            <li key={movement.id} className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{MOVEMENT_LABELS[movement.movement_type]}</span>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{getMotionDirectionLabel(movement.movement_type, movement.stock_adjustment_direction)}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{getMovementSummaryText(movement)}</p>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{formatDateTime(movement.created_at)}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No movements recorded for this variant yet.</p>
                      )
                    ) : (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Select a stock row to inspect its recent movement history.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Choose a stock row to inspect current balance and recent movement history.</p>
              )}
            </section>

            {canWriteInventory ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <ArrowUpCircle className="h-4 w-4" />
                  <h3 className="text-base font-semibold">Adjust stock</h3>
                </div>

                <form className="mt-4 space-y-4" onSubmit={handleAdjustmentSubmit}>
                  <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium">Variant</span>
                    <select
                      value={adjustmentForm.variantId}
                      onChange={(event) => setAdjustmentForm((current) => ({ ...current, variantId: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Choose a variant</option>
                      {variantOptions.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.product_name} · {getVariantSummaryLabel(variant.variant_name, variant.flavour, variant.bottle_size_ml)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">Direction</span>
                      <select
                        value={adjustmentForm.direction}
                        onChange={(event) => {
                          const nextDirection = event.target.value === 'decrease' ? 'decrease' : 'increase'
                          setAdjustmentForm((current) => ({ ...current, direction: nextDirection }))
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                    </label>

                    <Input
                      label="Quantity (crates)"
                      type="number"
                      min="1"
                      step="1"
                      value={adjustmentForm.quantity}
                      onChange={(event) => setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))}
                    />
                  </div>

                  <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium">Reason</span>
                    <textarea
                      value={adjustmentForm.notes}
                      onChange={(event) => setAdjustmentForm((current) => ({ ...current, notes: event.target.value }))}
                      rows={3}
                      placeholder="Why is this stock being adjusted?"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </label>

                  {adjustmentPreview ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                      <p className="font-medium">Adjustment preview</p>
                      <p className="mt-1">{adjustmentPreview.productName} · {adjustmentPreview.variantLabel}</p>
                      <p className="mt-1">Current stock: {adjustmentPreview.currentBalance} crates</p>
                      <p className="mt-1">{adjustmentPreview.label}</p>
                      <p className="mt-1">Projected stock after adjustment: {adjustmentPreview.nextBalance} crates</p>
                      {adjustmentPreview.wouldBeNegative ? (
                        <p className="mt-2 font-medium text-red-700 dark:text-red-300">Warning: this would create a negative stock balance. Adjust the quantity before saving.</p>
                      ) : null}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmittingAdjustment}
                    className="w-full"
                    disabled={!adjustmentForm.variantId || !adjustmentForm.notes.trim() || Boolean(adjustmentPreview?.wouldBeNegative) || isSubmittingAdjustment}
                  >
                    {isAdjustmentConfirmationVisible ? 'Confirm adjustment' : 'Save adjustment'}
                  </Button>

                  {isAdjustmentConfirmationVisible ? (
                    <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                      <div>
                        <p className="font-medium">Confirm this stock adjustment</p>
                        <p className="mt-1">
                          {adjustmentPreview?.productName} · {adjustmentPreview?.variantLabel}
                        </p>
                        <p className="mt-1">Current stock: {adjustmentPreview?.currentBalance ?? 0} crates</p>
                        <p className="mt-1">{adjustmentPreview?.label}</p>
                        <p className="mt-1">Projected stock: {adjustmentPreview?.nextBalance ?? 0} crates</p>
                        <p className="mt-1">Reason: {adjustmentForm.notes.trim()}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setIsAdjustmentConfirmationVisible(false)}
                        disabled={isSubmittingAdjustment}
                      >
                        Keep editing
                      </Button>
                    </div>
                  ) : null}
                </form>
              </section>
            ) : null}
          </aside>
        </div>
      ) : null}

      {canWriteInventory ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <ArrowUpCircle className="h-4 w-4" />
              <h3 className="text-base font-semibold">Opening stock</h3>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleOpeningStockSubmit}>
              <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <span className="font-medium">Product variant</span>
                <select
                  value={openingForm.variantId}
                  onChange={(event) => setOpeningForm((current) => ({ ...current, variantId: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Choose a variant</option>
                  {variantOptions.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.product_name} · {getVariantSummaryLabel(variant.variant_name, variant.flavour, variant.bottle_size_ml)}
                    </option>
                  ))}
                </select>
              </label>

              <Input
                label="Quantity in crates"
                type="number"
                min="1"
                step="1"
                value={openingForm.quantity}
                onChange={(event) => setOpeningForm((current) => ({ ...current, quantity: event.target.value }))}
              />

              <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                <span className="font-medium">Notes</span>
                <textarea
                  value={openingForm.notes}
                  onChange={(event) => setOpeningForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={3}
                  placeholder="Optional notes for the opening stock record"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>

              <Alert variant="info" title="Opening stock guidance">
                Opening stock should be entered once for a variant. Later corrections must use stock adjustments instead of another opening-stock entry.
              </Alert>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingOpening}
                className="w-full"
                disabled={!openingForm.variantId || !openingForm.quantity || isSubmittingOpening}
              >
                {isOpeningConfirmationVisible ? 'Confirm opening stock' : 'Save opening stock'}
              </Button>

              {isOpeningConfirmationVisible ? (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                  <div>
                    <p className="font-medium">Confirm this opening stock entry</p>
                    <p className="mt-1">
                      {(() => {
                        const variant = variantOptions.find((item) => item.id === openingForm.variantId)
                        if (!variant) {
                          return 'Selected variant'
                        }

                        return `${variant.product_name} · ${getVariantSummaryLabel(variant.variant_name, variant.flavour, variant.bottle_size_ml)}`
                      })()}
                    </p>
                    <p className="mt-1">Quantity: {openingForm.quantity} crates</p>
                    <p className="mt-1">This records the initial stock and should only be done once for the variant.</p>
                    {openingForm.notes.trim() ? <p className="mt-1">Notes: {openingForm.notes.trim()}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setIsOpeningConfirmationVisible(false)}
                    disabled={isSubmittingOpening}
                  >
                    Keep editing
                  </Button>
                </div>
              ) : null}
            </form>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <ClipboardList className="h-4 w-4" />
          <h3 className="text-base font-semibold">Movement history</h3>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="Search movements"
            value={movementSearchTerm}
            onChange={(event) => setMovementSearchTerm(event.target.value)}
            placeholder="Search history"
            className="min-w-[160px]"
          />
          <select
            value={movementVariantFilter}
            onChange={(event) => setMovementVariantFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="all">All variants</option>
            {variantOptions.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.product_name} · {getVariantSummaryLabel(variant.variant_name, variant.flavour, variant.bottle_size_ml)}
              </option>
            ))}
          </select>
          <select
            value={movementFilter}
            onChange={(event) => setMovementFilter(event.target.value as (typeof movementTypeOptions)[number]['value'])}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            {movementTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {filteredMovements.length > 0 ? (
            filteredMovements.slice(0, 12).map((movement) => (
              <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{movement.product_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {getVariantSummaryLabel(movement.variant_name, movement.flavour, movement.bottle_size_ml)}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {MOVEMENT_LABELS[movement.movement_type]}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>{getMotionDirectionLabel(movement.movement_type, movement.stock_adjustment_direction)}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatMovementEffect(movement)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(movement.created_at)}</p>
                {movement.notes ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{movement.notes}</p> : null}
              </div>
            ))
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No movement history matches the selected filters.</p>
          )}
        </div>
      </section>
    </div>
  )
}
