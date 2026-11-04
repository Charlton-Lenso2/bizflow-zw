import { supabase } from '../../../lib/supabase'
import type { ManufacturerSummary, ProductCatalogueItem, ProductVariant } from '../types/catalogue'

export type ProductFormInput = {
  name: string
  manufacturer_id?: string | null
  brand?: string | null
  description?: string | null
}

export type VariantFormInput = {
  variant_name?: string | null
  flavour?: string | null
  bottle_size_ml?: number | null
  is_active?: boolean
}

export type PriceFormInput = {
  selling_price_per_crate: number
}

export type PackagingFormInput = {
  packaging_type_id: string
  quantity_required: number
}

function ensureBusinessScopedId(businessId: string): void {
  if (!businessId) {
    throw new Error('No active business selected.')
  }
}

function validateProductName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) {
    throw new Error('Product name is required.')
  }
  return trimmed
}

function validateVariantInput(input: VariantFormInput): { variant_name: string | null; flavour: string | null; bottle_size_ml: number | null } {
  const variantName = input.variant_name?.trim() ?? ''
  const flavour = input.flavour?.trim() ?? ''
  const bottleSizeValue = input.bottle_size_ml !== undefined && input.bottle_size_ml !== null ? Number(input.bottle_size_ml) : null

  if (variantName === '' && flavour === '' && (bottleSizeValue === null || Number.isNaN(bottleSizeValue))) {
    throw new Error('Provide a variant name, flavour, or bottle size.')
  }

  if (variantName !== '' && variantName.length > 255) {
    throw new Error('Variant name is too long.')
  }

  if (flavour !== '' && flavour.length > 255) {
    throw new Error('Flavour is too long.')
  }

  if (bottleSizeValue !== null) {
    if (!Number.isFinite(bottleSizeValue) || bottleSizeValue <= 0) {
      throw new Error('Bottle size must be a valid positive number when provided.')
    }
  }

  return {
    variant_name: variantName || null,
    flavour: flavour || null,
    bottle_size_ml: bottleSizeValue,
  }
}

function validatePriceInput(input: PriceFormInput): number {
  if (!Number.isFinite(input.selling_price_per_crate) || input.selling_price_per_crate <= 0) {
    throw new Error('Selling price must be greater than zero.')
  }

  return Number(input.selling_price_per_crate)
}

function validatePackagingInput(input: PackagingFormInput): { packaging_type_id: string; quantity_required: number } {
  if (!input.packaging_type_id) {
    throw new Error('Packaging type is required.')
  }

  const quantity = Number(input.quantity_required)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Packaging quantity must be greater than zero.')
  }

  return {
    packaging_type_id: input.packaging_type_id,
    quantity_required: quantity,
  }
}

async function assertProductBelongsToBusiness(productId: string, businessId: string): Promise<void> {
  ensureBusinessScopedId(businessId)

  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('business_id', businessId)
    .limit(1)

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('The selected product does not belong to the active business.')
  }
}

async function assertVariantBelongsToBusiness(variantId: string, businessId: string): Promise<void> {
  ensureBusinessScopedId(businessId)

  const { data, error } = await supabase
    .from('product_variants')
    .select('id')
    .eq('id', variantId)
    .eq('business_id', businessId)
    .limit(1)

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('The selected variant does not belong to the active business.')
  }
}

async function assertPackagingTypeBelongsToBusiness(packagingTypeId: string, businessId: string): Promise<void> {
  ensureBusinessScopedId(businessId)

  const { data, error } = await supabase
    .from('packaging_types')
    .select('id')
    .eq('id', packagingTypeId)
    .eq('business_id', businessId)
    .limit(1)

  if (error) {
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('The selected packaging type does not belong to the active business.')
  }
}

export async function fetchCatalogueForBusiness(businessId: string): Promise<ProductCatalogueItem[]> {
  ensureBusinessScopedId(businessId)

  const { data, error } = await supabase
    .from('products')
    .select(
      `
        id,
        business_id,
        manufacturer_id,
        name,
        brand,
        description,
        is_active,
        manufacturers(id, name),
        product_variants(
          id,
          product_id,
          variant_name,
          flavour,
          bottle_size_ml,
          is_active,
          product_prices(currency, selling_price_per_crate, is_active, effective_from),
          product_packaging(
            id,
            quantity_required,
            packaging_types(id, name, packaging_category)
          )
        )
      `,
    )
    .eq('business_id', businessId)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ProductCatalogueItem[]
}

export async function fetchManufacturersForBusiness(businessId: string): Promise<ManufacturerSummary[]> {
  ensureBusinessScopedId(businessId)

  const { data, error } = await supabase
    .from('manufacturers')
    .select('id, name')
    .eq('business_id', businessId)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as ManufacturerSummary[]
}

export async function fetchPackagingTypesForBusiness(businessId: string): Promise<Array<{ id: string; name: string; packaging_category: string | null }>> {
  ensureBusinessScopedId(businessId)

  const { data, error } = await supabase
    .from('packaging_types')
    .select('id, name, packaging_category')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Array<{ id: string; name: string; packaging_category: string | null }>
}

export async function createProductRecord(businessId: string, input: ProductFormInput): Promise<ProductCatalogueItem> {
  ensureBusinessScopedId(businessId)

  const name = validateProductName(input.name)

  if (input.manufacturer_id) {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('id')
      .eq('id', input.manufacturer_id)
      .eq('business_id', businessId)
      .limit(1)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('The selected manufacturer does not belong to the active business.')
    }
  }

  const { data, error } = await supabase
    .from('products')
    .insert([
      {
        business_id: businessId,
        manufacturer_id: input.manufacturer_id ?? null,
        name,
        brand: input.brand?.trim() || null,
        description: input.description?.trim() || null,
        is_active: true,
      },
    ])
    .select(
      `
        id,
        business_id,
        manufacturer_id,
        name,
        brand,
        description,
        is_active,
        manufacturers(id, name),
        product_variants(
          id,
          product_id,
          variant_name,
          flavour,
          bottle_size_ml,
          is_active,
          product_prices(currency, selling_price_per_crate, is_active, effective_from),
          product_packaging(
            id,
            quantity_required,
            packaging_types(id, name, packaging_category)
          )
        )
      `,
    )
    .single()

  if (error) {
    throw error
  }

  return data as ProductCatalogueItem
}

export async function updateProductRecord(productId: string, businessId: string, input: ProductFormInput): Promise<void> {
  if (!productId || !businessId) {
    throw new Error('Product or business is missing.')
  }

  const name = validateProductName(input.name)

  if (input.manufacturer_id) {
    const { data, error } = await supabase
      .from('manufacturers')
      .select('id')
      .eq('id', input.manufacturer_id)
      .eq('business_id', businessId)
      .limit(1)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('The selected manufacturer does not belong to the active business.')
    }
  }

  const { error } = await supabase
    .from('products')
    .update({
      manufacturer_id: input.manufacturer_id ?? null,
      name,
      brand: input.brand?.trim() || null,
      description: input.description?.trim() || null,
    })
    .eq('id', productId)
    .eq('business_id', businessId)

  if (error) {
    throw error
  }
}

export async function setProductStatus(productId: string, businessId: string, isActive: boolean): Promise<void> {
  if (!productId || !businessId) {
    throw new Error('Product or business is missing.')
  }

  await assertProductBelongsToBusiness(productId, businessId)

  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
    .eq('business_id', businessId)

  if (error) {
    throw error
  }
}

export async function createVariantRecord(
  productId: string,
  businessId: string,
  input: VariantFormInput,
): Promise<ProductVariant> {
  if (!productId || !businessId) {
    throw new Error('Product or business is missing.')
  }

  await assertProductBelongsToBusiness(productId, businessId)
  const { variant_name: trimmedVariantName, flavour: trimmedFlavour, bottle_size_ml: bottleSize } = validateVariantInput(input)

  const { data: existing, error: existingError } = await supabase
    .from('product_variants')
    .select('id')
    .eq('business_id', businessId)
    .eq('product_id', productId)
    .eq('flavour', trimmedFlavour)
    .eq('bottle_size_ml', bottleSize)
    .limit(1)

  if (existingError) {
    throw existingError
  }

  if (existing && existing.length > 0) {
    throw new Error('A variant with the same flavour and bottle size already exists for this product.')
  }

  const { data, error } = await supabase
    .from('product_variants')
    .insert([
      {
        business_id: businessId,
        product_id: productId,
        variant_name: trimmedVariantName,
        flavour: trimmedFlavour,
        bottle_size_ml: bottleSize,
        is_active: input.is_active ?? true,
      },
    ])
    .select(
      `
        id,
        product_id,
        variant_name,
        flavour,
        bottle_size_ml,
        is_active,
        product_prices(currency, selling_price_per_crate, is_active, effective_from),
        product_packaging(
          id,
          quantity_required,
          packaging_types(id, name, packaging_category)
        )
      `,
    )
    .single()

  if (error) {
    throw error
  }

  return data as unknown as ProductVariant
}

export async function updateVariantRecord(variantId: string, businessId: string, input: VariantFormInput): Promise<void> {
  if (!variantId || !businessId) {
    throw new Error('Variant or business is missing.')
  }

  await assertVariantBelongsToBusiness(variantId, businessId)
  const { variant_name: variantName, flavour: variantFlavour, bottle_size_ml: bottleSize } = validateVariantInput(input)

  const { error } = await supabase
    .from('product_variants')
    .update({
      variant_name: variantName,
      flavour: variantFlavour,
      bottle_size_ml: bottleSize,
      is_active: input.is_active ?? true,
    })
    .eq('id', variantId)
    .eq('business_id', businessId)

  if (error) {
    throw error
  }
}

export async function setVariantStatus(variantId: string, businessId: string, isActive: boolean): Promise<void> {
  if (!variantId || !businessId) {
    throw new Error('Variant or business is missing.')
  }

  await assertVariantBelongsToBusiness(variantId, businessId)

  const { error } = await supabase
    .from('product_variants')
    .update({ is_active: isActive })
    .eq('id', variantId)
    .eq('business_id', businessId)

  if (error) {
    throw error
  }
}

export async function setVariantPrice(
  variantId: string,
  businessId: string,
  sellingPricePerCrate: number,
): Promise<void> {
  if (!variantId || !businessId) {
    throw new Error('Variant or business is missing.')
  }

  await assertVariantBelongsToBusiness(variantId, businessId)
  const validatedPrice = validatePriceInput({ selling_price_per_crate: sellingPricePerCrate })

  const { error } = await supabase.rpc('set_variant_price', {
    p_business_id: businessId,
    p_product_variant_id: variantId,
    p_selling_price_per_crate: validatedPrice,
  })

  if (error) {
    throw error
  }
}

export async function upsertPackagingRequirement(
  variantId: string,
  businessId: string,
  input: PackagingFormInput,
): Promise<void> {
  if (!variantId || !businessId) {
    throw new Error('Variant or business is missing.')
  }

  await assertVariantBelongsToBusiness(variantId, businessId)
  const { packaging_type_id, quantity_required } = validatePackagingInput(input)
  await assertPackagingTypeBelongsToBusiness(packaging_type_id, businessId)

  const { data: existing, error: lookupError } = await supabase
    .from('product_packaging')
    .select('id')
    .eq('business_id', businessId)
    .eq('product_variant_id', variantId)
    .eq('packaging_type_id', packaging_type_id)
    .limit(1)

  if (lookupError) {
    throw lookupError
  }

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from('product_packaging')
      .update({ quantity_required: quantity_required })
      .eq('id', existing[0].id)
      .eq('business_id', businessId)

    if (error) {
      throw error
    }

    return
  }

  const { error } = await supabase.from('product_packaging').insert([
    {
      business_id: businessId,
      product_variant_id: variantId,
      packaging_type_id: packaging_type_id,
      quantity_required: quantity_required,
    },
  ])

  if (error) {
    throw error
  }
}

export async function removePackagingRequirement(requirementId: string, businessId: string): Promise<void> {
  if (!requirementId || !businessId) {
    throw new Error('Packaging requirement or business is missing.')
  }

  throw new Error(
    'Packaging requirement deletion is unavailable because the current schema does not provide a safe non-destructive archival path for product_packaging records. Historical packaging relationships must remain intact.',
  )
}
