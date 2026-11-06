export type CustomerRecord = {
  id: string
  business_id?: string | null
  full_name?: string | null
  business_name?: string | null
  phone?: string | null
  address?: string | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type CustomerFilterStatus = 'all' | 'active' | 'inactive'

export type CustomerSearchResult = CustomerRecord & {
  current_outstanding_balance: number
  total_sales: number
  total_payments: number
}

export type CustomerLedgerEntry = {
  id: string
  customer_id?: string | null
  business_id?: string | null
  amount?: number | null
  payment_method?: string | null
  reference?: string | null
  entry_type?: string | null
  created_at?: string | null
}

export type CustomerPackagingBalanceRow = {
  packaging_type_id?: string | null
  packaging_type_name?: string | null
  packaging_category?: string | null
  balance_quantity?: number | null
  is_owed?: boolean | null
}

export type CustomerPackagingTransactionRow = {
  id: string
  customer_id?: string | null
  business_id?: string | null
  packaging_type_id?: string | null
  packaging_type_name?: string | null
  packaging_category?: string | null
  quantity?: number | null
  transaction_type?: string | null
  created_at?: string | null
}

export type CustomerSaleRow = {
  id: string
  sale_number?: string | null
  customer_id?: string | null
  status?: string | null
  currency?: string | null
  subtotal?: number | null
  discount_amount?: number | null
  total_amount?: number | null
  created_at?: string | null
}

export type CustomerDetailSummary = {
  current_outstanding_balance: number
  total_sales: number
  total_payments: number
  active_shipping_count: number
  customer_owed: number
}

export type CustomerDetailRow = CustomerRecord & {
  sales?: CustomerSaleRow[] | null
  payments?: CustomerLedgerEntry[] | null
  packaging_balances?: CustomerPackagingBalanceRow[] | null
  packaging_transactions?: CustomerPackagingTransactionRow[] | null
}