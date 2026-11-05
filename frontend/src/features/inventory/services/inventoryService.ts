import { supabase } from '../../../lib/supabase'
import type {
  InventoryMovementRow,
  InventoryMovementType,
  InventoryOverview,
  InventoryVariantRow,
  ProductVariantOption,
} from '../types/inventory'

export const MOVEMENT_LABELS: Record<InventoryMovementType, string> = {
  opening_stock: 'Opening stock',
  purchase_received: 'Purchase received',
  sale: 'Sale',
  customer_return: 'Customer return',
  damaged: 'Damaged',
  lost: 'Lost',
  stock_adjustment: 'Stock adjustment',
}

const WRITE_ROLES = new Set(['owner', 'administrator', 'manager'])

function ensureBusinessScope(businessId: string): void {
  if (!businessId) {
    throw new Error('Select a business before accessing inventory.')
  }
}

function toPositiveInteger(value: number | string | null | undefined, label: string): number {
  const parsed = typeof value === 'string' ? Number(value) : value ?? null

  if (parsed === null || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive whole number.`)
  }

  return parsed
}

function toMovementLabel(type: InventoryMovementType): string {
  return MOVEMENT_LABELS[type] ?? type.replace(/_/g, ' ')
}

function getStockStatus(quantity: number): InventoryVariantRow['status'] {
  if (quantity === 0) {
    return 'out-of-stock'
  }

  if (quantity <= 10) {
    return 'low-stock'
  }

  return 'in-stock'
}

function getVariantDisplayName(variantName: string | null, flavour: string | null, size: number | null): string {
  const parts = [variantName, flavour].filter(Boolean)

  if (parts.length === 0 && size !== null) {
    return `Bottle size ${size}ml`
  }

  if (parts.length === 0) {
    return 'Unnamed variant'
  }

  const variantLabel = parts.join(' · ')
  return size !== null ? `${variantLabel} · ${size}ml` : variantLabel
}

export async function fetchInventoryVariantsForBusiness(businessId: string) {
  ensureBusinessScope(businessId)

  const [{ data: productRows, error: productError }, { data: variantRows, error: variantError }] = await Promise.all([
    supabase.from('products').select('id, business_id, name, brand').eq('business_id', businessId).order('name', { ascending: true }),
    supabase
      .from('product_variants')
      .select('id, business_id, product_id, variant_name, flavour, bottle_size_ml, is_active')
      .eq('business_id', businessId)
      .order('variant_name', { ascending: true }),
  ])

  if (productError) {
    throw productError
  }

  if (variantError) {
    throw variantError
  }

  const productsById = new Map((productRows ?? []).map((row) => [row.id, row]))
  return (variantRows ?? []).map((variant) => {
    const product = productsById.get(variant.product_id)

    return {
      id: variant.id,
      product_id: variant.product_id,
      product_name: product?.name ?? 'Unknown product',
      brand: product?.brand ?? null,
      variant_name: variant.variant_name ?? null,
      flavour: variant.flavour ?? null,
      bottle_size_ml: variant.bottle_size_ml ?? null,
      is_active: Boolean(variant.is_active),
    }
  })
}

export async function fetchInventoryOverview(businessId: string): Promise<InventoryOverview> {
  ensureBusinessScope(businessId)

  const [{ data: balanceRows, error: balanceError }, { data: movementRows, error: movementError }] = await Promise.all([
    supabase
      .from('inventory_stock_balances')
      .select('id, business_id, product_variant_id, quantity_crates, updated_at')
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('inventory_movements')
      .select('id, business_id, product_variant_id, movement_type, quantity_crates, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
  ])

  if (balanceError) {
    throw balanceError
  }

  if (movementError) {
    throw movementError
  }

  const variants = await fetchInventoryVariantsForBusiness(businessId)
  const balanceMap = new Map<string, number>()

  for (const row of balanceRows ?? []) {
    balanceMap.set(row.product_variant_id, Number(row.quantity_crates) || 0)
  }

  const lastMovementByVariant = new Map<string, { created_at: string }>()
  for (const row of movementRows ?? []) {
    const existing = lastMovementByVariant.get(row.product_variant_id)
    if (!existing || new Date(row.created_at).getTime() > new Date(existing.created_at).getTime()) {
      lastMovementByVariant.set(row.product_variant_id, { created_at: row.created_at })
    }
  }

  const rows: InventoryVariantRow[] = variants.map((variant) => {
    const quantityCrates = balanceMap.get(variant.id) ?? 0
    const lastMovement = lastMovementByVariant.get(variant.id)

    return {
      id: variant.id,
      product_id: variant.product_id,
      business_id: businessId,
      product_name: variant.product_name,
      brand: variant.brand,
      variant_name: variant.variant_name,
      flavour: variant.flavour,
      bottle_size_ml: variant.bottle_size_ml,
      quantity_crates: quantityCrates,
      status: getStockStatus(quantityCrates),
      last_movement_at: lastMovement?.created_at ?? null,
      is_active: variant.is_active,
    }
  })

  const totalCrates = rows.reduce((total, item) => total + item.quantity_crates, 0)
  const lowStockCount = rows.filter((item) => item.status === 'low-stock').length
  const outOfStockCount = rows.filter((item) => item.status === 'out-of-stock').length

  return {
    totalVariants: rows.length,
    totalCrates,
    lowStockCount,
    outOfStockCount,
    rows,
  }
}

export async function fetchMovementHistory(
  businessId: string,
  variantId?: string | null,
): Promise<InventoryMovementRow[]> {
  ensureBusinessScope(businessId)

  let query = supabase
    .from('inventory_movements')
    .select(
      'id, business_id, product_variant_id, movement_type, quantity_crates, stock_adjustment_direction, source_type, source_id, created_by, notes, created_at',
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (variantId) {
    query = query.eq('product_variant_id', variantId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const variants = await fetchInventoryVariantsForBusiness(businessId)
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]))

  return (data ?? []).map((row) => {
    const variantMeta = variantsById.get(row.product_variant_id)

    return {
      id: row.id,
      business_id: row.business_id,
      product_variant_id: row.product_variant_id,
      product_name: variantMeta?.product_name ?? 'Unknown product',
      brand: variantMeta?.brand ?? null,
      variant_name: variantMeta?.variant_name ?? null,
      flavour: variantMeta?.flavour ?? null,
      bottle_size_ml: variantMeta?.bottle_size_ml ?? null,
      movement_type: row.movement_type,
      quantity_crates: Number(row.quantity_crates) || 0,
      stock_adjustment_direction: row.stock_adjustment_direction ?? null,
      source_type: row.source_type ?? null,
      source_id: row.source_id ?? null,
      created_by: row.created_by ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at,
    }
  })
}

export async function fetchInventoryOptionsForBusiness(businessId: string): Promise<ProductVariantOption[]> {
  const overview = await fetchInventoryOverview(businessId)

  return overview.rows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    brand: row.brand,
    variant_name: row.variant_name,
    flavour: row.flavour,
    bottle_size_ml: row.bottle_size_ml,
    quantity_crates: row.quantity_crates,
    current_status: row.status,
  }))
}

export async function hasOpeningStockRecord(businessId: string, variantId: string): Promise<boolean> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('inventory_movements')
    .select('id')
    .eq('business_id', businessId)
    .eq('product_variant_id', variantId)
    .eq('movement_type', 'opening_stock')
    .limit(1)

  if (error) {
    throw error
  }

  return Boolean(data && data.length > 0)
}

export async function assertVariantBelongsToBusiness(businessId: string, variantId: string): Promise<void> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('product_variants')
    .select('id')
    .eq('business_id', businessId)
    .eq('id', variantId)
    .limit(1)

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('The selected product variant is not part of the active business.')
  }
}

export async function recordOpeningStock(
  businessId: string,
  variantId: string,
  quantity: number,
  notes?: string | null,
): Promise<void> {
  ensureBusinessScope(businessId)
  await assertVariantBelongsToBusiness(businessId, variantId)

  if (await hasOpeningStockRecord(businessId, variantId)) {
    throw new Error('Opening stock has already been recorded for this product variant. Use a stock adjustment for corrections.')
  }

  const safeQuantity = toPositiveInteger(quantity, 'Opening stock quantity')

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('You must be signed in to record inventory movements.')
  }

  const payload = {
    business_id: businessId,
    product_variant_id: variantId,
    movement_type: 'opening_stock',
    quantity_crates: safeQuantity,
    stock_adjustment_direction: null,
    source_type: null,
    source_id: null,
    created_by: userData.user.id,
    notes: notes?.trim() ? notes.trim() : null,
  }

  const { error } = await supabase.from('inventory_movements').insert([payload])

  if (error) {
    throw error
  }
}

export async function recordStockAdjustment(
  businessId: string,
  variantId: string,
  direction: 'increase' | 'decrease',
  quantity: number,
  notes?: string | null,
): Promise<void> {
  ensureBusinessScope(businessId)
  await assertVariantBelongsToBusiness(businessId, variantId)

  const safeQuantity = toPositiveInteger(quantity, 'Adjustment quantity')
  const directionValue = direction === 'increase' ? 1 : -1

  const { data: currentBalanceData, error: balanceError } = await supabase
    .from('inventory_stock_balances')
    .select('quantity_crates')
    .eq('business_id', businessId)
    .eq('product_variant_id', variantId)
    .limit(1)
    .maybeSingle()

  if (balanceError) {
    throw balanceError
  }

  const currentBalance = Number(currentBalanceData?.quantity_crates ?? 0)
  const projectedBalance = currentBalance + safeQuantity * directionValue

  if (projectedBalance < 0) {
    throw new Error(`This adjustment would reduce stock below zero. Current stock is ${currentBalance} crates.`)
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('You must be signed in to record inventory movements.')
  }

  const payload = {
    business_id: businessId,
    product_variant_id: variantId,
    movement_type: 'stock_adjustment',
    quantity_crates: safeQuantity,
    stock_adjustment_direction: directionValue,
    source_type: null,
    source_id: null,
    created_by: userData.user.id,
    notes: notes?.trim() ? notes.trim() : null,
  }

  const { error } = await supabase.from('inventory_movements').insert([payload])

  if (error) {
    throw error
  }
}

export function formatMovementEffect(item: Pick<InventoryMovementRow, 'movement_type' | 'stock_adjustment_direction' | 'quantity_crates'>): string {
  if (item.movement_type === 'stock_adjustment') {
    const direction = item.stock_adjustment_direction === -1 ? 'Decrease' : 'Increase'
    return `${direction} ${item.quantity_crates} crates`
  }

  if (item.movement_type === 'sale' || item.movement_type === 'damaged' || item.movement_type === 'lost') {
    return `Decrease ${item.quantity_crates} crates`
  }

  return `Increase ${item.quantity_crates} crates`
}

export function getMotionDirectionLabel(movementType: InventoryMovementType, stockAdjustmentDirection: number | null): string {
  if (movementType === 'stock_adjustment') {
    return stockAdjustmentDirection === -1 ? 'Decrease' : 'Increase'
  }

  if (movementType === 'sale' || movementType === 'damaged' || movementType === 'lost') {
    return 'Decrease'
  }

  return 'Increase'
}

export function getVariantSummaryLabel(
  variantName: string | null,
  flavour: string | null,
  bottleSizeMl: number | null,
): string {
  return getVariantDisplayName(variantName, flavour, bottleSizeMl)
}

export function canManageInventory(role: string | null | undefined): boolean {
  return Boolean(role && WRITE_ROLES.has(role))
}

export function getMovementSummaryText(item: Pick<InventoryMovementRow, 'movement_type' | 'quantity_crates' | 'stock_adjustment_direction'>): string {
  const label = toMovementLabel(item.movement_type)
  if (item.movement_type === 'stock_adjustment') {
    return `${label}: ${item.stock_adjustment_direction === -1 ? 'Decrease' : 'Increase'} ${item.quantity_crates} crates`
  }

  return `${label}: ${item.quantity_crates} crates`
}
