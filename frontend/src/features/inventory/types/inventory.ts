export type InventoryMovementType =
  | 'opening_stock'
  | 'purchase_received'
  | 'sale'
  | 'customer_return'
  | 'damaged'
  | 'lost'
  | 'stock_adjustment'

export type InventoryStockStatus = 'in-stock' | 'low-stock' | 'out-of-stock'

export type InventoryBalanceRow = {
  id: string
  business_id: string
  product_variant_id: string
  quantity_crates: number
  updated_at: string | null
}

export type InventoryVariantRow = {
  id: string
  product_id: string
  business_id: string
  product_name: string
  brand: string | null
  variant_name: string | null
  flavour: string | null
  bottle_size_ml: number | null
  quantity_crates: number
  status: InventoryStockStatus
  last_movement_at: string | null
  is_active: boolean
}

export type InventoryMovementRow = {
  id: string
  business_id: string
  product_variant_id: string
  product_name: string
  brand: string | null
  variant_name: string | null
  flavour: string | null
  bottle_size_ml: number | null
  movement_type: InventoryMovementType
  quantity_crates: number
  stock_adjustment_direction: number | null
  source_type: string | null
  source_id: string | null
  created_by: string | null
  notes: string | null
  created_at: string
}

export type InventoryOverview = {
  totalVariants: number
  totalCrates: number
  lowStockCount: number
  outOfStockCount: number
  rows: InventoryVariantRow[]
}

export type ProductVariantOption = {
  id: string
  product_id: string
  product_name: string
  brand: string | null
  variant_name: string | null
  flavour: string | null
  bottle_size_ml: number | null
  quantity_crates: number
  current_status: InventoryStockStatus
}
