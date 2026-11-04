import { supabase } from '../../../lib/supabase'
import type { DashboardActivityItem, DashboardSummary } from '../types/dashboard'

type Row = Record<string, unknown>

const COMPLETED_SALE_STATUSES = new Set(['completed', 'paid', 'closed'])

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return null
}

function normaliseStatus(value: unknown): string {
  return asString(value)?.toLowerCase() ?? ''
}

function isCompletedSaleStatus(status: unknown): boolean {
  const normalised = normaliseStatus(status)
  return COMPLETED_SALE_STATUSES.has(normalised)
}

function getFirstMatch(row: Row, candidateKeys: string[]): unknown {
  for (const key of candidateKeys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key]
    }
  }

  return undefined
}

async function fetchProductCounts(businessId: string) {
  const { count: activeCount, error: activeError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (activeError) {
    throw activeError
  }

  const { count: totalCount, error: totalError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)

  if (totalError) {
    throw totalError
  }

  return {
    activeProductCount: activeCount ?? 0,
    productCount: totalCount ?? 0,
  }
}

async function fetchVariantCounts(businessId: string) {
  const { count, error } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (error) {
    throw error
  }

  return count ?? 0
}

async function fetchStockOnHand(businessId: string): Promise<{ stockOnHand: number | null; stockSource: 'projection' | 'unavailable' }> {
  const { data, error } = await supabase
    .from('inventory_stock_balances')
    .select('*')
    .eq('business_id', businessId)
    .limit(100)

  if (error) {
    throw error
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { stockOnHand: null, stockSource: 'unavailable' }
  }

  let total = 0

  for (const row of data) {
    const candidate = getFirstMatch(row as Row, [
      'quantity_on_hand',
      'on_hand_quantity',
      'available_quantity',
      'stock_on_hand',
      'total_quantity',
      'quantity',
      'available_crates',
    ])

    total += asNumber(candidate)
  }

  return { stockOnHand: total, stockSource: 'projection' }
}

async function fetchSalesRows(businessId: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throw error
  }

  return (data ?? []) as Row[]
}

async function fetchRecentInventoryActivity(businessId: string) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    throw error
  }

  return (data ?? []) as Row[]
}

function mapSalesToActivity(rows: Row[]): DashboardActivityItem[] {
  return rows.map((row) => {
    const status = normaliseStatus(row.status)
    const saleNumber = asString(row.sale_number) ?? `Sale ${asString(row.id) ?? 'record'}`
    const amountValue = asNumber(getFirstMatch(row, ['total_amount', 'amount', 'sales_total']))

    return {
      id: asString(row.id) ?? saleNumber,
      type: 'sale',
      title: saleNumber,
      description: status ? `Status: ${status}` : 'Completed sale recorded',
      timestamp: asString(row.created_at),
      amountText:
        amountValue > 0 ? `${amountValue.toLocaleString()} ${asString(row.currency) ?? ''}`.trim() : undefined,
    }
  })
}

function mapInventoryToActivity(rows: Row[]): DashboardActivityItem[] {
  return rows.map((row) => {
    const movementType = asString(getFirstMatch(row, ['movement_type', 'transaction_type'])) ?? 'inventory update'
    const quantity = asNumber(getFirstMatch(row, ['quantity_crates', 'quantity', 'quantity_on_hand']))

    return {
      id: asString(row.id) ?? `${movementType}-${Math.random().toString(16).slice(2)}`,
      type: 'inventory',
      title: movementType.replace(/_/g, ' '),
      description: quantity ? `${quantity} crates recorded` : 'Inventory movement recorded',
      timestamp: asString(row.created_at),
    }
  })
}

export async function fetchDashboardSummary(businessId: string): Promise<DashboardSummary> {
  if (!businessId) {
    throw new Error('No active business selected.')
  }

  const [productSummary, variantCount, stockSummary, salesRows, inventoryRows] = await Promise.all([
    fetchProductCounts(businessId),
    fetchVariantCounts(businessId),
    fetchStockOnHand(businessId),
    fetchSalesRows(businessId),
    fetchRecentInventoryActivity(businessId),
  ])

  const completedSales = salesRows.filter((row) => isCompletedSaleStatus(row.status))

  const recentActivity: DashboardActivityItem[] = [
    ...mapSalesToActivity(completedSales.slice(0, 5)),
    ...mapInventoryToActivity(inventoryRows.slice(0, 5)),
  ].sort((a, b) => {
    const aDate = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const bDate = b.timestamp ? new Date(b.timestamp).getTime() : 0
    return bDate - aDate
  })

  return {
    productCount: productSummary.productCount,
    activeVariantCount: productSummary.activeProductCount || variantCount,
    stockOnHand: stockSummary.stockOnHand,
    completedSalesCount: completedSales.length,
    recentActivity: recentActivity.slice(0, 6),
    stockSource: stockSummary.stockSource,
  }
}
