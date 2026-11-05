export type CustomerRecord = {
  id: string
  business_id?: string | null
  full_name?: string | null
  business_name?: string | null
  phone?: string | null
  credit_limit?: number | null
  is_active?: boolean | null
}

export type InventoryBalanceRow = {
  product_variant_id: string
  quantity_crates: number | null
}

export type ProductPriceRow = {
  currency: string | null
  selling_price_per_crate: number | null
  effective_from?: string | null
  is_active?: boolean | null
}

export type PackagingRequirementRow = {
  id: string
  product_variant_id: string
  packaging_type_id: string
  quantity_required: number | null
  packaging_types?: {
    id: string
    name: string | null
    packaging_category?: string | null
  } | null
}

export type SaleVariantOption = {
  id: string
  product_id: string
  product_name: string | null
  brand: string | null
  variant_name: string | null
  flavour: string | null
  bottle_size_ml: number | null
  is_active: boolean
  current_price: number | null
  price_currency: string | null
  stock_on_hand: number
  packaging_requirements: Array<{
    packaging_type_id: string
    packaging_type_name: string | null
    packaging_category: string | null
    quantity_required: number
  }>
}

export type SaleCartItem = {
  variantId: string
  productName: string
  variantLabel: string
  unitPrice: number
  quantity: number
  discount: number
  stockOnHand: number
}

export type SaleRow = {
  id: string
  sale_number: string | null
  customer_id: string | null
  status: string | null
  currency: string | null
  subtotal: number | null
  discount_amount: number | null
  total_amount: number | null
  created_at: string | null
  customers?: {
    id: string
    full_name: string | null
    business_name: string | null
  } | null
}

export type SaleItemRow = {
  id: string
  sale_id: string
  product_variant_id: string
  product_name_snapshot: string | null
  variant_name_snapshot: string | null
  quantity_crates: number | null
  unit_price: number | null
  discount_amount: number | null
  line_total: number | null
  created_at?: string | null
}

export type SaleDetailRow = SaleRow & {
  customer?: CustomerRecord | null
  sale_items?: SaleItemRow[] | null
  payments?: SalePaymentEntry[] | null
  packaging_deposits?: SalePackagingDepositRow[] | null
}

export type PackagingReturnEntry = {
  packaging_type_id: string
  quantity: number
}

export type PackagingDepositEntry = {
  packaging_type_id: string
  amount: number
}

export type SalePaymentEntry = {
  id: string
  sale_id?: string | null
  amount?: number | null
  payment_method?: string | null
  reference?: string | null
  entry_type?: string | null
  created_at?: string | null
  note?: string | null
}

export type SalePackagingDepositRow = {
  id: string
  sale_id?: string | null
  business_id?: string | null
  packaging_type_id?: string | null
  packaging_type_name?: string | null
  quantity?: number | null
  amount?: number | null
  currency?: string | null
  status?: string | null
  is_refunded?: boolean | null
  refunded_at?: string | null
  created_at?: string | null
  packaging_types?: {
    id?: string | null
    name?: string | null
    packaging_category?: string | null
  } | null
}
