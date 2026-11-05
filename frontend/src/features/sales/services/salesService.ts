import { supabase } from '../../../lib/supabase'
import type {
  CustomerRecord,
  InventoryBalanceRow,
  PackagingDepositEntry,
  PackagingRequirementRow,
  PackagingReturnEntry,
  SaleDetailRow,
  SalePackagingDepositRow,
  SalePaymentEntry,
  SaleRow,
  SaleVariantOption,
} from '../types/sales'

const USD_CURRENCY = 'USD'

function ensureBusinessScope(businessId: string): void {
  if (!businessId) {
    throw new Error('Select a business before accessing sales.')
  }
}

function moneyValue(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function normaliseCustomerName(record: CustomerRecord | null | undefined): string {
  const fullName = record?.full_name?.trim()
  const businessName = record?.business_name?.trim()

  if (fullName) {
    return fullName
  }

  if (businessName) {
    return businessName
  }

  return 'Unknown customer'
}

export async function fetchCustomersForBusiness(businessId: string): Promise<CustomerRecord[]> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('customers')
    .select('id, business_id, full_name, business_name, phone, credit_limit, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as CustomerRecord[]
}

export async function fetchWalkInCustomer(businessId: string): Promise<CustomerRecord | null> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('customers')
    .select('id, business_id, full_name, business_name, phone, credit_limit, is_active')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  const matches = (data ?? []) as CustomerRecord[]
  const walkIn = matches.find((customer) => {
    const name = `${customer.full_name ?? ''} ${customer.business_name ?? ''}`.toLowerCase()
    return name.includes('walk-in customer') || name.includes('walk in customer')
  })

  return walkIn ?? null
}

export async function ensureWalkInCustomerForBusiness(businessId: string): Promise<CustomerRecord | null> {
  ensureBusinessScope(businessId)

  const existing = await fetchWalkInCustomer(businessId)
  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        business_id: businessId,
        full_name: 'Walk-in Customer',
        business_name: 'Walk-in Customer',
        phone: null,
        credit_limit: 0,
        is_active: true,
      },
    ])
    .select('id, business_id, full_name, business_name, phone, credit_limit, is_active')
    .single()

  if (error) {
    throw error
  }

  return data as CustomerRecord
}

export async function fetchProductVariantsForSale(businessId: string): Promise<SaleVariantOption[]> {
  ensureBusinessScope(businessId)

  const [{ data: variantRows, error: variantError }, { data: balanceRows, error: balanceError }, { data: packagingRows, error: packagingError }] =
    await Promise.all([
      supabase
        .from('product_variants')
        .select(
          'id, product_id, variant_name, flavour, bottle_size_ml, is_active, products(id, name, brand, manufacturers(name))',
        )
        .eq('business_id', businessId)
        .eq('is_active', true),
      supabase
        .from('inventory_stock_balances')
        .select('product_variant_id, quantity_crates')
        .eq('business_id', businessId),
      supabase
        .from('product_packaging')
        .select('id, product_variant_id, packaging_type_id, quantity_required, packaging_types(id, name, packaging_category)')
        .eq('business_id', businessId),
    ])

  if (variantError) {
    throw variantError
  }

  if (balanceError) {
    throw balanceError
  }

  if (packagingError) {
    throw packagingError
  }

  const balancesByVariant = new Map<string, number>()
  for (const row of (balanceRows ?? []) as InventoryBalanceRow[]) {
    balancesByVariant.set(row.product_variant_id, Number(row.quantity_crates) || 0)
  }

  const packagingByVariant = new Map<string, Array<{ packaging_type_id: string; packaging_type_name: string | null; packaging_category: string | null; quantity_required: number }>>()

  for (const row of (packagingRows ?? []) as unknown as PackagingRequirementRow[]) {
    const current = packagingByVariant.get(row.product_variant_id) ?? []
    current.push({
      packaging_type_id: row.packaging_type_id,
      packaging_type_name: row.packaging_types?.name ?? null,
      packaging_category: row.packaging_types?.packaging_category ?? null,
      quantity_required: Number(row.quantity_required) || 0,
    })
    packagingByVariant.set(row.product_variant_id, current)
  }

  const { data: priceRows, error: priceError } = await supabase
    .from('product_prices')
    .select('product_variant_id, currency, selling_price_per_crate, is_active, effective_from')
    .eq('business_id', businessId)
    .eq('currency', USD_CURRENCY)
    .eq('is_active', true)

  if (priceError) {
    throw priceError
  }

  const pricesByVariant = new Map<string, number>()
  for (const row of (priceRows ?? []) as Array<{ product_variant_id: string; selling_price_per_crate: number | null }>) {
    const price = Number(row.selling_price_per_crate)
    if (Number.isFinite(price) && price > 0) {
      pricesByVariant.set(row.product_variant_id, price)
    }
  }

  const items = (variantRows ?? []) as unknown as Array<{
    id: string
    product_id: string
    variant_name: string | null
    flavour: string | null
    bottle_size_ml: number | null
    is_active: boolean
    products: {
      id: string
      name: string | null
      brand: string | null
      manufacturers?: { name: string | null } | null
    }
  }>

  return items
    .map((variant) => {
      const productName = variant.products?.name ?? 'Unknown product'
      const price = pricesByVariant.get(variant.id) ?? null

      return {
        id: variant.id,
        product_id: variant.product_id,
        product_name: productName,
        brand: variant.products?.brand ?? null,
        variant_name: variant.variant_name,
        flavour: variant.flavour,
        bottle_size_ml: variant.bottle_size_ml,
        is_active: Boolean(variant.is_active),
        current_price: price,
        price_currency: price === null ? null : USD_CURRENCY,
        stock_on_hand: balancesByVariant.get(variant.id) ?? 0,
        packaging_requirements: packagingByVariant.get(variant.id) ?? [],
      }
    })
    .filter((item) => item.current_price !== null)
}

export async function fetchSalesForBusiness(businessId: string): Promise<SaleRow[]> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, sale_number, customer_id, status, currency, subtotal, discount_amount, total_amount, created_at, customers(id, full_name, business_name)',
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as unknown as SaleRow[]
}

export async function fetchSaleDetail(businessId: string, saleId: string): Promise<SaleDetailRow | null> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('sales')
    .select(
      'id, sale_number, customer_id, status, currency, subtotal, discount_amount, total_amount, created_at, customers(id, full_name, business_name), sale_items(id, sale_id, product_variant_id, product_name_snapshot, variant_name_snapshot, quantity_crates, unit_price, discount_amount, line_total)',
    )
    .eq('business_id', businessId)
    .eq('id', saleId)
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  const sale = data as unknown as SaleDetailRow

  const [{ data: paymentRows, error: paymentError }, { data: depositRows, error: depositError }] = await Promise.all([
    supabase
      .from('customer_ledger_entries')
      .select('id, sale_id, amount, payment_method, reference, created_at, entry_type')
      .eq('business_id', businessId)
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false }),
    supabase
      .from('packaging_deposits')
      .select(
        'id, sale_id, business_id, packaging_type_id, quantity, amount, currency, status, is_refunded, refunded_at, created_at, packaging_types(id, name, packaging_category)',
      )
      .eq('business_id', businessId)
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false }),
  ])

  if (paymentError) {
    throw paymentError
  }

  if (depositError) {
    throw depositError
  }

  sale.payments = (paymentRows ?? []) as SalePaymentEntry[]
  sale.packaging_deposits = (depositRows ?? []) as unknown as SalePackagingDepositRow[]

  return sale
}

export async function createDraftSale(params: {
  businessId: string
  customerId: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  createdBy: string
}): Promise<{ id: string; sale_number: string | null; total_amount: number | null }> {
  ensureBusinessScope(params.businessId)

  if (!params.customerId) {
    throw new Error('A registered customer is required before completing a sale.')
  }

  const { data, error } = await supabase
    .from('sales')
    .insert([
      {
        business_id: params.businessId,
        customer_id: params.customerId,
        currency: USD_CURRENCY,
        subtotal: params.subtotal,
        discount_amount: params.discountAmount,
        total_amount: params.totalAmount,
        status: 'draft',
        created_by: params.createdBy,
      },
    ])
    .select('id, sale_number, total_amount')
    .single()

  if (error) {
    throw error
  }

  return data as { id: string; sale_number: string | null; total_amount: number | null }
}

export async function insertSaleItems(
  businessId: string,
  saleId: string,
  items: Array<{
    product_variant_id: string
    product_name_snapshot: string
    variant_name_snapshot: string
    quantity_crates: number
    unit_price: number
    discount_amount: number
    line_total: number
  }>,
): Promise<void> {
  ensureBusinessScope(businessId)

  if (!saleId) {
    throw new Error('Sale ID is missing.')
  }

  if (!items.length) {
    throw new Error('Add at least one item before completing a sale.')
  }

  const { error } = await supabase.from('sale_items').insert(
    items.map((item) => ({
      business_id: businessId,
      sale_id: saleId,
      product_variant_id: item.product_variant_id,
      product_name_snapshot: item.product_name_snapshot,
      variant_name_snapshot: item.variant_name_snapshot,
      quantity_crates: item.quantity_crates,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
      line_total: item.line_total,
    })),
  )

  if (error) {
    throw error
  }
}

export async function completeSale(payload: {
  saleId: string
  packagingReturned: PackagingReturnEntry[]
  exceptionMode: string | null
  exceptionReason: string | null
  deposits: PackagingDepositEntry[]
  initialPayment: number
  paymentMethod: string | null
}): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('complete_sale', {
    p_sale_id: payload.saleId,
    p_packaging_returned: payload.packagingReturned,
    p_exception_mode: payload.exceptionMode,
    p_exception_reason: payload.exceptionReason,
    p_deposits: payload.deposits,
    p_initial_payment: payload.initialPayment,
    p_payment_method: payload.paymentMethod,
  })

  if (error) {
    throw error
  }

  return (data ?? {}) as Record<string, unknown>
}

export async function makeCustomerPayment(args: {
  businessId: string
  saleId: string
  amount: number
  paymentMethod: string
  reference: string
}): Promise<Record<string, unknown>> {
  ensureBusinessScope(args.businessId)

  const { data, error } = await supabase.rpc('record_customer_payment', {
    p_business_id: args.businessId,
    p_sale_id: args.saleId,
    p_amount: args.amount,
    p_payment_method: args.paymentMethod,
    p_reference: args.reference,
  })

  if (error) {
    throw error
  }

  return (data ?? {}) as Record<string, unknown>
}

export async function refundPackagingDeposit(depositId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('refund_packaging_deposit', {
    p_packaging_deposit_id: depositId,
  })

  if (error) {
    throw error
  }

  return (data ?? {}) as Record<string, unknown>
}

export function getCustomerLabel(customer: CustomerRecord | null | undefined): string {
  return normaliseCustomerName(customer)
}

export function formatCurrency(value: number | null | undefined): string {
  const numeric = value == null ? 0 : Number(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0)
}

export function toSuggestedPaymentMethod(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  return trimmed || null
}

export function buildPackagingReturnEntries(
  requirements: Array<{ packaging_type_id: string; quantity_required: number }>,
  returnedAmounts: Record<string, number>,
): PackagingReturnEntry[] {
  return requirements
    .map((requirement) => ({
      packaging_type_id: requirement.packaging_type_id,
      quantity: Number(returnedAmounts[requirement.packaging_type_id] ?? requirement.quantity_required),
    }))
    .filter((entry) => entry.quantity >= 0)
}

export function calculateLineTotals(items: Array<{ unitPrice: number; quantity: number; discount: number }>) {
  return items.map((item) => {
    const subtotal = item.unitPrice * item.quantity
    const discountAmount = Math.min(item.discount, subtotal)
    const total = Math.max(subtotal - discountAmount, 0)

    return {
      subtotal,
      discountAmount,
      total,
    }
  })
}

export function getSaleStatusLabel(status: string | null | undefined): string {
  const normalised = (status ?? '').toString().trim().toLowerCase()
  if (!normalised) {
    return 'Unknown'
  }

  return normalised.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getInitialPaymentPreview(total: number, initialPayment: number): number {
  if (!Number.isFinite(initialPayment)) {
    return 0
  }

  return Math.min(Math.max(initialPayment, 0), total)
}

export function derivePackagingShortage(requirements: Array<{ quantity_required: number }>, returned: number): number {
  const requiredTotal = requirements.reduce((sum, item) => sum + (Number(item.quantity_required) || 0), 0)
  return Math.max(requiredTotal - returned, 0)
}

export function isReceiptPrintableAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.print === 'function'
}

export function getSaleSummaryFromDraft(items: Array<{ unitPrice: number; quantity: number; discount: number }>) {
  const totals = calculateLineTotals(items)
  const subtotal = totals.reduce((sum, item) => sum + item.subtotal, 0)
  const discount = totals.reduce((sum, item) => sum + item.discountAmount, 0)
  const total = totals.reduce((sum, item) => sum + item.total, 0)

  return { subtotal, discount, total }
}

export function getPriceForVariant(variantId: string, prices: Array<{ product_variant_id: string; selling_price_per_crate: number | null }>): number {
  const match = prices.find((row) => row.product_variant_id === variantId)
  return moneyValue(match?.selling_price_per_crate)
}

export function formatSaleNumber(saleNumber: string | null | undefined): string {
  if (saleNumber && saleNumber.trim()) {
    return saleNumber
  }

  return 'Draft sale'
}

export function getCustomerDisplayName(record: CustomerRecord | null | undefined): string {
  return getCustomerLabel(record)
}

export function canCompleteSaleWithException(role: string | null | undefined): boolean {
  const normalised = (role ?? '').toLowerCase()
  return ['owner', 'administrator', 'manager'].includes(normalised)
}
