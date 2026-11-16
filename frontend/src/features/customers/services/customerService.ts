import { supabase } from "../../../lib/supabase"

import type {
  CustomerDetailRow,
  CustomerLedgerEntry,
  CustomerPackagingBalanceRow,
  CustomerPackagingTransactionRow,
  CustomerRecord,
  CustomerSearchResult,
} from '../types/customer'


function ensureBusinessScope(businessId: string): void {
  if (!businessId) {
    throw new Error('Select a business before accessing customers.')
  }
}



function toNumber(value: unknown): number {
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
export async function fetchWalkInCustomer(businessId: string): Promise<CustomerRecord | null> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('customers')
    .select('id, business_id, full_name, business_name, phone, address, is_active, created_at, updated_at')
    .eq('business_id', businessId)
    .eq('full_name', 'Walk-in Customer')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as CustomerRecord
}
export async function fetchCustomersForBusiness(businessId: string): Promise<CustomerRecord[]> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('customers')
    .select('id, business_id, full_name, business_name, phone, address, is_active, created_at, updated_at')
    .eq('business_id', businessId)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as CustomerRecord[]
}


export async function fetchAllCustomersForBusiness(businessId: string): Promise<CustomerRecord[]> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('customers')
    .select('id, business_id, full_name, business_name, phone, address, is_active, created_at, updated_at')
    .eq('business_id', businessId)
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as CustomerRecord[]
}


export async function fetchCustomerById(
  businessId: string,
  customerId: string
): Promise<CustomerDetailRow | null> {
  ensureBusinessScope(businessId)

  const { data, error } = await supabase
    .from('customers')
    .select('id, business_id, full_name, business_name, phone, address, is_active, created_at, updated_at')
    .eq('business_id', businessId)
    .eq('id', customerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw error
  }

  const customer = data as unknown as CustomerDetailRow

  const [
    { data: ledgerRows, error: ledgerError },
    { data: salesRows, error: salesError },
    { data: balanceRows, error: balanceError },
    { data: txRows, error: txError },
  ] = await Promise.all([
    supabase
      .from('customer_ledger_entries')
      .select('id, customer_id, business_id, sale_id, amount, currency, payment_method, reference, entry_type, notes, created_at')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('sales')
      .select('id, sale_number, customer_id, status, currency, subtotal, discount_amount, total_amount, created_at')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('customer_packaging_accounts')
      .select('id, packaging_type_id, packaging_type_name, packaging_category, balance_quantity, is_owed')
      .eq('business_id', businessId)
      .eq('customer_id', customerId),
    supabase
      .from('packaging_transactions')
      .select('id, customer_id, business_id, packaging_type_id, packaging_type_name, packaging_category, quantity, transaction_type, created_at')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ])

  if (ledgerError) {
    throw ledgerError
  }

  if (salesError) {
    throw salesError
  }

  if (balanceError) {
    throw balanceError
  }

  if (txError) {
    throw txError
  }

  customer.payments = (ledgerRows ?? []) as CustomerLedgerEntry[]
  customer.sales = (salesRows ?? []) as CustomerDetailRow['sales']
  customer.packaging_balances = (balanceRows ?? []) as CustomerPackagingBalanceRow[]
  customer.packaging_transactions = (txRows ?? []) as CustomerPackagingTransactionRow[]

  return customer
}

export async function fetchCustomersWithFinancialSummary(
  businessId: string,
  searchTerm: string
): Promise<CustomerSearchResult[]> {
  ensureBusinessScope(businessId)

  const term = searchTerm.trim()
  const query = supabase
    .from('customers')
    .select('id, business_id, full_name, business_name, phone, address, is_active, created_at, updated_at')
    .eq('business_id', businessId)
    .order('full_name', { ascending: true })

  if (term) {
    query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const customers = (data ?? []) as CustomerRecord[]

  const results: CustomerSearchResult[] = customers.map(customer => ({
    ...customer,
    current_outstanding_balance_usd: 0,
    current_outstanding_balance_zwg: 0,
    total_sales_usd: 0,
    total_sales_zwg: 0,
    total_payments_usd: 0,
    total_payments_zwg: 0,
  }))

  if (customers.length === 0) {
    return results
  }

  const customerIds = customers.map(customer => customer.id)
  const customersById = new Map(
    results.map(customer => [customer.id, customer])
  )

  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('customer_ledger_entries')
      .select('id, customer_id, business_id, sale_id, amount, currency, payment_method, reference, entry_type, notes, created_at')
      .eq('business_id', businessId)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (ledgerError) {
      throw ledgerError
    }

    const entries = ledgerEntries ?? []

    for (const entry of entries) {
      const customer = customersById.get(entry.customer_id)

      if (!customer) {
        continue
      }

      const amount = toNumber(entry.amount)

      if (entry.currency === 'USD') {
        customer.current_outstanding_balance_usd += amount

        if (entry.entry_type === 'sale_charge') {
          customer.total_sales_usd += amount
        } else if (entry.entry_type === 'payment') {
          customer.total_payments_usd += Math.abs(amount)
        }
      } else if (entry.currency === 'ZWG') {
        customer.current_outstanding_balance_zwg += amount

        if (entry.entry_type === 'sale_charge') {
          customer.total_sales_zwg += amount
        } else if (entry.entry_type === 'payment') {
          customer.total_payments_zwg += Math.abs(amount)
        }
      }
    }

    if (entries.length < pageSize) {
      break
    }

    offset += entries.length
  }

  return results
}

export async function createCustomer(input: {
  businessId: string
  fullName: string
  businessName?: string | null
  phone?: string | null
    address?: string | null
}): Promise<CustomerRecord | null> {
  ensureBusinessScope(input.businessId)

  // Protect the permanent Walk-in Customer from being duplicated
  const existing = await fetchWalkInCustomer(input.businessId)
  if (existing && existing.full_name === 'Walk-in Customer' && existing.business_name === 'Walk-in Customer') {
    if (input.fullName === 'Walk-in Customer' && input.businessName === 'Walk-in Customer') {
      return existing
    }
  }

  const { data, error } = await supabase.from('customers').insert([
    {
      business_id: input.businessId,
      full_name: input.fullName.trim(),
      business_name: input.businessName?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      is_active: true,
    },
  ]).select('id, business_id, full_name, business_name, phone, address, is_active, created_at, updated_at').single()

  if (error) {
    throw error
  }

  return data as CustomerRecord
}


export async function updateCustomer(input: {
  businessId: string
  customerId: string
  fullName: string
  businessName?: string | null
  phone?: string | null
    address?: string | null
  isActive?: boolean
}): Promise<CustomerRecord | null> {
  ensureBusinessScope(input.businessId)

  // Protect the permanent Walk-in Customer from being deactivated or edited
  const walkIn = await fetchWalkInCustomer(input.businessId)
  if (walkIn && input.customerId === walkIn.id) {
    return walkIn
  }

  const { data, error } = await supabase
    .from('customers')
    .update({
      full_name: input.fullName.trim(),
      business_name: input.businessName?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      address: input.address?.trim() ?? null,
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', input.businessId)
    .eq('id', input.customerId)
    .select('id, business_id, full_name, business_name, phone, address, is_active, created_at, updated_at')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as CustomerRecord
}


export async function deleteCustomer(input: { businessId: string; customerId: string }): Promise<boolean> {
  ensureBusinessScope(input.businessId)

  // Prefer deactivation over hard deletion to preserve historical sales and ledger entries
  const { error } = await supabase.from('customers').update({ is_active: false, updated_at: new Date().toISOString() }).eq('business_id', input.businessId).eq('id', input.customerId)

  if (error) {
    throw error
  }

  return true
}
export function getCustomerStatus(customer: CustomerRecord | null | undefined): string {
  if (customer == null) {
    return 'Unknown'
  }
  return customer.is_active ? 'Active' : 'Inactive'
}

export function formatCustomerName(customer: CustomerRecord | null | undefined): string {
  const fullName = customer?.full_name?.trim()
  const businessName = customer?.business_name?.trim()
  if (fullName) {
    return fullName
  }
  if (businessName) {
    return businessName
  }
  return 'Unknown customer'
}

export function isWalkInCustomer(customer: CustomerRecord | null | undefined): boolean {
  if (customer == null) {
    return false
  }
  const full = (customer.full_name || '') + ' ' + (customer.business_name || '')
  const lower = full.toLowerCase()
  return lower.includes('walk-in customer') || lower.includes('walk in customer')
}

export function formatCurrency(value: number | null | undefined): string {
  const numeric = value == null ? 0 : Number(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(numeric == null ? 0 : numeric)
}
