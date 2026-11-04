import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Boxes, PackageSearch, Plus } from 'lucide-react'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { LoadingState } from '../../../components/ui/LoadingState'
import { useBusiness } from '../../business/hooks/useActiveBusiness'
import { CatalogueList } from '../components/CatalogueList'
import {
  createProductRecord,
  createVariantRecord,
  fetchCatalogueForBusiness,
  fetchManufacturersForBusiness,
  fetchPackagingTypesForBusiness,
  setProductStatus,
  setVariantStatus,
  upsertPackagingRequirement,
  updateProductRecord,
  updateVariantRecord,
} from '../services/catalogueService'
import type { ManufacturerSummary, PackagingRequirement, ProductCatalogueItem, ProductVariant } from '../types/catalogue'

type ProductFormState = {
  name: string
  manufacturer_id: string
  brand: string
  description: string
}

type VariantFormState = {
  variant_name: string
  flavour: string
  bottle_size_ml: string
  is_active: boolean
}

type PackagingFormState = {
  packaging_type_id: string
  quantity_required: string
}

const emptyProductForm = (): ProductFormState => ({
  name: '',
  manufacturer_id: '',
  brand: '',
  description: '',
})

const emptyVariantForm = (): VariantFormState => ({
  variant_name: '',
  flavour: '',
  bottle_size_ml: '',
  is_active: true,
})

export function CataloguePage() {
  const { activeBusiness, activeBusinessId, isLoading } = useBusiness()
  const [products, setProducts] = useState<ProductCatalogueItem[]>([])
  const [manufacturers, setManufacturers] = useState<ManufacturerSummary[]>([])
  const [packagingTypes, setPackagingTypes] = useState<Array<{ id: string; name: string; packaging_category: string | null }>>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [isSavingVariant, setIsSavingVariant] = useState(false)
  const [isSavingPackaging, setIsSavingPackaging] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm())

  const [variantEditor, setVariantEditor] = useState<{
    productId: string
    variantId?: string
    form: VariantFormState
  } | null>(null)

  const [packagingEditor, setPackagingEditor] = useState<{
    variantId: string
    requirementId?: string
    form: PackagingFormState
  } | null>(null)

  const refreshCatalogue = useCallback(async () => {
    if (!activeBusinessId) {
      return
    }

    const [nextProducts, nextManufacturers, nextPackagingTypes] = await Promise.all([
      fetchCatalogueForBusiness(activeBusinessId),
      fetchManufacturersForBusiness(activeBusinessId),
      fetchPackagingTypesForBusiness(activeBusinessId),
    ])

    setProducts(nextProducts)
    setManufacturers(nextManufacturers)
    setPackagingTypes(nextPackagingTypes)
  }, [activeBusinessId])

  useEffect(() => {
    if (!activeBusinessId) {
      return
    }

    let isMounted = true

    const loadCatalogue = async () => {
      setProducts([])
      setManufacturers([])
      setPackagingTypes([])
      setErrorMessage(null)
      setStatusMessage(null)
      setIsLoadingProducts(true)

      try {
        await refreshCatalogue()
        if (!isMounted) {
          return
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        console.error('Failed to load product catalogue', error)
        setProducts([])
        setManufacturers([])
        setPackagingTypes([])
        setErrorMessage('We could not load the product catalogue for this business right now.')
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false)
        }
      }
    }

    void loadCatalogue()

    return () => {
      isMounted = false
    }
  }, [activeBusinessId, refreshCatalogue])

  const resetProductForm = () => {
    setShowProductForm(false)
    setEditingProductId(null)
    setProductForm(emptyProductForm())
  }

  const startProductForm = (product?: ProductCatalogueItem) => {
    if (product) {
      setEditingProductId(product.id)
      setProductForm({
        name: product.name ?? '',
        manufacturer_id: product.manufacturer_id ?? '',
        brand: product.brand ?? '',
        description: product.description ?? '',
      })
    } else {
      setEditingProductId(null)
      setProductForm(emptyProductForm())
    }

    setShowProductForm(true)
    setStatusMessage(null)
  }

  const handleSaveProduct = async (event: FormEvent) => {
    event.preventDefault()

    if (!activeBusinessId) {
      setStatusMessage({ type: 'error', text: 'Select a business before saving a product.' })
      return
    }

    try {
      setIsSavingProduct(true)
      setStatusMessage(null)

      const payload = {
        name: productForm.name,
        manufacturer_id: productForm.manufacturer_id || null,
        brand: productForm.brand || null,
        description: productForm.description || null,
      }

      if (editingProductId) {
        await updateProductRecord(editingProductId, activeBusinessId, payload)
      } else {
        await createProductRecord(activeBusinessId, payload)
      }

      setStatusMessage({
        type: 'success',
        text: editingProductId ? 'Product details updated successfully.' : 'Product family created successfully.',
      })
      resetProductForm()
      await refreshCatalogue()
    } catch (error) {
      console.error('Failed to save product', error)
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'The product could not be saved.',
      })
    } finally {
      setIsSavingProduct(false)
    }
  }

  const handleToggleProductStatus = async (productId: string, isActive: boolean) => {
    if (!activeBusinessId) {
      return
    }

    try {
      setStatusMessage(null)
      await setProductStatus(productId, activeBusinessId, isActive)
      setStatusMessage({
        type: 'success',
        text: isActive ? 'Product reactivated.' : 'Product deactivated.',
      })
      await refreshCatalogue()
    } catch (error) {
      console.error('Failed to update product status', error)
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'The product status could not be updated.',
      })
    }
  }

  const openVariantEditor = (productId: string, variant?: ProductVariant) => {
    if (variant) {
      setVariantEditor({
        productId,
        variantId: variant.id,
        form: {
          variant_name: variant.variant_name ?? '',
          flavour: variant.flavour ?? '',
          bottle_size_ml: variant.bottle_size_ml ? String(variant.bottle_size_ml) : '',
          is_active: variant.is_active ?? true,
        },
      })
    } else {
      setVariantEditor({
        productId,
        form: emptyVariantForm(),
      })
    }

    setStatusMessage(null)
  }

  const handleVariantFieldChange = (field: keyof VariantFormState, value: string | boolean) => {
    setVariantEditor((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        form: {
          ...current.form,
          [field]: value,
        },
      }
    })
  }

  const handleSaveVariant = async (event: FormEvent) => {
    event.preventDefault()

    if (!activeBusinessId || !variantEditor) {
      setStatusMessage({ type: 'error', text: 'Choose a business and variant before saving.' })
      return
    }

    try {
      setIsSavingVariant(true)
      setStatusMessage(null)

      const payload = {
        variant_name: variantEditor.form.variant_name || null,
        flavour: variantEditor.form.flavour || null,
        bottle_size_ml: variantEditor.form.bottle_size_ml ? Number(variantEditor.form.bottle_size_ml) : null,
        is_active: variantEditor.form.is_active,
      }

      if (variantEditor.variantId) {
        await updateVariantRecord(variantEditor.variantId, activeBusinessId, payload)
      } else {
        await createVariantRecord(variantEditor.productId, activeBusinessId, payload)
      }

      setStatusMessage({
        type: 'success',
        text: variantEditor.variantId ? 'Variant updated successfully.' : 'Variant created successfully.',
      })
      setVariantEditor(null)
      await refreshCatalogue()
    } catch (error) {
      console.error('Failed to save variant', error)
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'The variant could not be saved.',
      })
    } finally {
      setIsSavingVariant(false)
    }
  }

  const handleToggleVariantStatus = async (variantId: string, isActive: boolean) => {
    if (!activeBusinessId) {
      return
    }

    try {
      setStatusMessage(null)
      await setVariantStatus(variantId, activeBusinessId, isActive)
      setStatusMessage({
        type: 'success',
        text: isActive ? 'Variant activated.' : 'Variant deactivated.',
      })
      await refreshCatalogue()
    } catch (error) {
      console.error('Failed to update variant status', error)
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'The variant status could not be updated.',
      })
    }
  }

  const openPackagingEditor = (variant: ProductVariant, requirement?: PackagingRequirement) => {
    setPackagingEditor({
      variantId: variant.id,
      requirementId: requirement?.id,
      form: {
        packaging_type_id: Array.isArray(requirement?.packaging_types)
          ? requirement.packaging_types[0]?.id ?? ''
          : requirement?.packaging_types?.id ?? '',
        quantity_required: requirement?.quantity_required != null ? String(requirement.quantity_required) : '',
      },
    })
    setStatusMessage(null)
  }

  const handlePackagingFieldChange = (field: keyof PackagingFormState, value: string) => {
    setPackagingEditor((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        form: {
          ...current.form,
          [field]: value,
        },
      }
    })
  }

  const handleSavePackaging = async (event: FormEvent) => {
    event.preventDefault()

    if (!activeBusinessId || !packagingEditor) {
      setStatusMessage({ type: 'error', text: 'Choose a variant before configuring packaging.' })
      return
    }

    try {
      setIsSavingPackaging(true)
      setStatusMessage(null)

      const quantity = Number(packagingEditor.form.quantity_required)
      if (!packagingEditor.form.packaging_type_id) {
        throw new Error('Choose a packaging type.')
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Packaging quantity must be a positive number.')
      }

      await upsertPackagingRequirement(packagingEditor.variantId, activeBusinessId, {
        packaging_type_id: packagingEditor.form.packaging_type_id,
        quantity_required: quantity,
      })

      setStatusMessage({ type: 'success', text: 'Packaging requirement saved successfully.' })
      setPackagingEditor(null)
      await refreshCatalogue()
    } catch (error) {
      console.error('Failed to save packaging requirement', error)
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'The packaging requirement could not be saved.',
      })
    } finally {
      setIsSavingPackaging(false)
    }
  }

  if (isLoading || isLoadingProducts) {
    return <LoadingState message={isLoading ? 'Loading business context...' : 'Loading product catalogue...'} />
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Product catalogue
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {activeBusiness?.name ?? 'No active business selected'}
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Boxes className="h-4 w-4" />
            {products.length === 1 ? '1 product family' : `${products.length} product families`}
          </div>
        </div>
      </header>

      {!activeBusiness ? (
        <Alert variant="info" title="No active business selected">
          Choose a business from the selector above to view and manage its catalogue.
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="error" title="Catalogue unavailable">
          {errorMessage}
        </Alert>
      ) : null}

      {statusMessage ? (
        <Alert variant={statusMessage.type === 'error' ? 'error' : statusMessage.type === 'success' ? 'success' : 'info'} title={statusMessage.type === 'error' ? 'Action required' : statusMessage.type === 'success' ? 'Saved' : 'Status'}>
          {statusMessage.text}
        </Alert>
      ) : null}

      {activeBusiness ? (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  <PackageSearch className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Catalogue management</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage product families, variants, pricing and packaging requirements.
                  </p>
                </div>
              </div>

              {!showProductForm ? (
                <Button variant="primary" onClick={() => startProductForm()}>
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add product
                  </span>
                </Button>
              ) : null}
            </div>

            {showProductForm ? (
              <form className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60" onSubmit={handleSaveProduct}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Product name"
                    name="name"
                    value={productForm.name}
                    onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Coca-Cola"
                  />

                  <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium">Manufacturer</span>
                    <select
                      value={productForm.manufacturer_id}
                      onChange={(event) => setProductForm((current) => ({ ...current, manufacturer_id: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="">Manufacturer not assigned</option>
                      {manufacturers.map((manufacturer) => (
                        <option key={manufacturer.id} value={manufacturer.id}>
                          {manufacturer.name ?? 'Manufacturer'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Brand"
                    name="brand"
                    value={productForm.brand}
                    onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))}
                    placeholder="Coca-Cola"
                  />

                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="block font-medium text-slate-700 dark:text-slate-200">Status</span>
                    <span className="mt-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                      Active by default
                    </span>
                  </div>
                </div>

                <Input
                  label="Description"
                  name="description"
                  value={productForm.description}
                  onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe the product family, flavour notes, or customer use case."
                />

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" variant="primary" isLoading={isSavingProduct}>
                    {editingProductId ? 'Update product' : 'Create product'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetProductForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}
          </div>

          <CatalogueList
            products={products}
            onEditProduct={startProductForm}
            onToggleProductStatus={handleToggleProductStatus}
            onAddVariant={openVariantEditor}
            onEditVariant={(product, variant) => openVariantEditor(product.id, variant)}
            onToggleVariantStatus={handleToggleVariantStatus}
            onManagePackaging={openPackagingEditor}
          />

          {variantEditor ? (
            <form
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              onSubmit={handleSaveVariant}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {variantEditor.variantId ? 'Edit variant' : 'Add variant'}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    {variantEditor.variantId ? 'Update variant details' : 'Create a new product variant'}
                  </h3>
                </div>
                <Button type="button" variant="secondary" onClick={() => setVariantEditor(null)}>
                  Close
                </Button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Input
                  label="Variant name"
                  value={variantEditor.form.variant_name}
                  onChange={(event) => handleVariantFieldChange('variant_name', event.target.value)}
                  placeholder="Zero Sugar 300ml"
                />
                <Input
                  label="Flavour"
                  value={variantEditor.form.flavour}
                  onChange={(event) => handleVariantFieldChange('flavour', event.target.value)}
                  placeholder="Original Taste"
                />
                <Input
                  label="Bottle size (ml)"
                  type="number"
                  min="1"
                  value={variantEditor.form.bottle_size_ml}
                  onChange={(event) => handleVariantFieldChange('bottle_size_ml', event.target.value)}
                  placeholder="330"
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  id="variant-active"
                  type="checkbox"
                  checked={variantEditor.form.is_active}
                  onChange={(event) => handleVariantFieldChange('is_active', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                <label htmlFor="variant-active" className="text-sm text-slate-700 dark:text-slate-200">
                  Active variant
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="submit" variant="primary" isLoading={isSavingVariant}>
                  {variantEditor.variantId ? 'Save variant' : 'Create variant'}
                </Button>
              </div>
            </form>
          ) : null}

          {packagingEditor ? (
            <form
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              onSubmit={handleSavePackaging}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Packaging requirement
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Set crate packaging requirement</h3>
                </div>
                <Button type="button" variant="secondary" onClick={() => setPackagingEditor(null)}>
                  Close
                </Button>
              </div>

              {packagingTypes.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  No active packaging types are available for this business yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-medium">Packaging type</span>
                    <select
                      value={packagingEditor.form.packaging_type_id}
                      onChange={(event) => handlePackagingFieldChange('packaging_type_id', event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select packaging type</option>
                      {packagingTypes.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} {entry.packaging_category ? `· ${entry.packaging_category}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Input
                    label="Quantity required per crate"
                    type="number"
                    min="1"
                    step="1"
                    value={packagingEditor.form.quantity_required}
                    onChange={(event) => handlePackagingFieldChange('quantity_required', event.target.value)}
                    placeholder="24"
                  />
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="submit" variant="primary" isLoading={isSavingPackaging} disabled={packagingTypes.length === 0}>
                  Save packaging requirement
                </Button>
              </div>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
