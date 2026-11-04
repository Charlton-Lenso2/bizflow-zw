export type ManufacturerSummary = {
  id: string
  name: string | null
}

export type PackagingTypeSummary = {
  id: string
  name: string | null
  packaging_category?: string | null
}

export type PackagingRequirement = {
  id?: string
  quantity_required?: number | null
  packaging_types?: PackagingTypeSummary | PackagingTypeSummary[] | null
}

export type VariantPrice = {
  currency?: string | null
  selling_price_per_crate?: number | null
  is_active?: boolean | null
  effective_from?: string | null
}

export type ProductVariant = {
  id: string
  variant_name?: string | null
  flavour?: string | null
  bottle_size_ml?: number | null
  is_active?: boolean | null
  product_prices?: VariantPrice[] | null
  product_packaging?: PackagingRequirement[] | null
}

export type ProductCatalogueItem = {
  id: string
  name: string | null
  brand?: string | null
  description?: string | null
  is_active?: boolean | null
  manufacturer_id?: string | null
  manufacturers?: ManufacturerSummary | ManufacturerSummary[] | null
  product_variants?: ProductVariant[] | null
}
