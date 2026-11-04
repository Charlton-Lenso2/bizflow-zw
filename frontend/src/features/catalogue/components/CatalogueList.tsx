import { PencilLine, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import type { PackagingRequirement, ProductCatalogueItem, ProductVariant } from '../types/catalogue'

function formatCurrency(value: number | null | undefined, currencyCode?: string | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Price unavailable'
  }

  const safeCurrency = currencyCode && ['USD', 'ZWG'].includes(currencyCode) ? currencyCode : 'USD'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
  }).format(value)
}

function formatVariantLabel(variant: ProductVariant): string {
  const flavour = variant.flavour?.trim() || 'Standard'
  const size = variant.bottle_size_ml ? `${variant.bottle_size_ml} ml` : 'Size not set'
  return `${flavour} / ${size}`
}

type CatalogueListProps = {
  products: ProductCatalogueItem[]
  onEditProduct: (product: ProductCatalogueItem) => void
  onToggleProductStatus: (productId: string, isActive: boolean) => void
  onAddVariant: (productId: string) => void
  onEditVariant: (product: ProductCatalogueItem, variant: ProductVariant) => void
  onToggleVariantStatus: (variantId: string, isActive: boolean) => void
  onManagePackaging: (variant: ProductVariant, requirement?: PackagingRequirement) => void
}

export function CatalogueList({
  products,
  onEditProduct,
  onToggleProductStatus,
  onAddVariant,
  onEditVariant,
  onToggleVariantStatus,
  onManagePackaging,
}: CatalogueListProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
        No products have been added to this business yet.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {products.map((product) => {
        const manufacturerName = Array.isArray(product.manufacturers)
          ? product.manufacturers[0]?.name ?? 'Manufacturer not assigned'
          : product.manufacturers?.name ?? 'Manufacturer not assigned'

        const variants = Array.isArray(product.product_variants) ? product.product_variants : []

        return (
          <article
            key={product.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Product family
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{product.name ?? 'Untitled product'}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {product.brand ? `Brand: ${product.brand}` : 'Brand not assigned'}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${product.is_active === false ? 'bg-slate-400' : 'bg-emerald-500'}`}
                    aria-hidden="true"
                  />
                  {product.is_active === false ? 'Inactive' : 'Active'}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => onEditProduct(product)}>
                    <span className="inline-flex items-center gap-2">
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onToggleProductStatus(product.id, product.is_active === false)}
                  >
                    {product.is_active === false ? 'Reactivate' : 'Deactivate'}
                  </Button>
                  <Button type="button" variant="primary" onClick={() => onAddVariant(product.id)}>
                    <span className="inline-flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add variant
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                Manufacturer: {manufacturerName}
              </span>
              {product.description ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-800">
                  {product.description}
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Variants
              </p>

              {variants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  No variants have been added to this product family yet.
                </div>
              ) : (
                variants.map((variant) => {
                  const prices = Array.isArray(variant.product_prices) ? variant.product_prices : []
                  const packaging = Array.isArray(variant.product_packaging) ? variant.product_packaging : []

                  return (
                    <div
                      key={variant.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {variant.variant_name ?? formatVariantLabel(variant)}
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {variant.flavour ?? 'Flavour not assigned'} · {variant.bottle_size_ml ?? 'N/A'} ml
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-2 md:items-end">
                          <span
                            className={`inline-flex items-center gap-2 self-start rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              variant.is_active === false
                                ? 'border border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
                            }`}
                          >
                            {variant.is_active === false ? 'Inactive variant' : 'Active variant'}
                          </span>

                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" onClick={() => onEditVariant(product, variant)}>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => onToggleVariantStatus(variant.id, variant.is_active === false)}
                            >
                              {variant.is_active === false ? 'Activate' : 'Deactivate'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => onManagePackaging(variant)}>
                              Packaging
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Selling prices
                          </p>
                          {prices.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No prices recorded yet.</p>
                          ) : (
                            <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                              {prices.map((price, index) => (
                                <li key={`${variant.id}-${price.currency ?? 'price'}-${index}`} className="flex items-center justify-between gap-2">
                                  <span>
                                    {price.currency ?? 'Currency'}: {formatCurrency(price.selling_price_per_crate ?? null, price.currency ?? 'USD')}
                                  </span>
                                  {price.is_active ? (
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                                      Active
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Packaging requirements
                          </p>
                          {packaging.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No packaging requirements recorded.</p>
                          ) : (
                            <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                              {packaging.map((entry, index) => {
                                const packagingType = Array.isArray(entry.packaging_types)
                                  ? entry.packaging_types[0]
                                  : entry.packaging_types

                                return (
                                  <li
                                    key={`${variant.id}-packaging-${entry.id ?? index}`}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900"
                                  >
                                    <span>
                                      {packagingType?.name ?? 'Packaging type'}: {entry.quantity_required ?? 0}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                      Required
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
