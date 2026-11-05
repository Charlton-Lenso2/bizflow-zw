import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageUp, Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { updateBusinessLogoUrl, uploadBusinessLogoForBusiness, validateBusinessLogoFile } from '../services/businessService'
import type { BusinessRecord } from '../types/business'
import {
  applyBrandPalette,
  buildBrandPalette,
  createPreviewObjectUrl,
  extractPaletteFromImage,
  FALLBACK_BRAND_PALETTE,
  getBusinessBranding,
  revokeObjectUrl,
  saveBrandingForBusiness,
  type BrandPalette,
} from '../utils/brandPalette'

export function BrandingPanel({ business }: { business: BusinessRecord }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const initialBranding = useMemo(
    () => getBusinessBranding(business.id, business.logo_url ?? null),
    [business.id, business.logo_url],
  )

  const [logoUrl, setLogoUrl] = useState<string | null>(initialBranding.logoUrl)
  const [palette, setPalette] = useState<BrandPalette>(initialBranding.palette)
  const [primaryColor, setPrimaryColor] = useState(initialBranding.palette.primary)
  const [accentColor, setAccentColor] = useState(initialBranding.palette.accent)
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    applyBrandPalette(palette)
  }, [palette])

  useEffect(() => {
    return () => {
      revokeObjectUrl(logoUrl)
    }
  }, [logoUrl])

  const updatePalette = (nextPrimary: string, nextAccent: string) => {
    const nextPalette = buildBrandPalette(nextPrimary, nextAccent)
    setPalette(nextPalette)
    setPrimaryColor(nextPrimary)
    setAccentColor(nextAccent)
  }

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    const validationMessage = validateBusinessLogoFile(selectedFile)
    if (validationMessage) {
      setStatusMessage(validationMessage)
      event.target.value = ''
      return
    }

    let previewUrl: string | null = null

    try {
      previewUrl = createPreviewObjectUrl(selectedFile)
      const extractedPalette = await extractPaletteFromImage(selectedFile)

      setLogoUrl(previewUrl)
      updatePalette(extractedPalette.primary, extractedPalette.accent)
      saveBrandingForBusiness(business.id, { logoUrl: previewUrl, palette: extractedPalette })

      try {
        const persistedLogoUrl = await uploadBusinessLogoForBusiness(business.id, selectedFile)
        setLogoUrl(persistedLogoUrl)
        saveBrandingForBusiness(business.id, { logoUrl: persistedLogoUrl, palette: extractedPalette })
        await updateBusinessLogoUrl(business.id, persistedLogoUrl)
        revokeObjectUrl(previewUrl)
        setStatusMessage('Logo uploaded to storage and the business record was updated.')
      } catch (storageError) {
        console.warn('Business logo storage is not yet configured.', storageError)
        setStatusMessage(
          'Temporary logo preview ready. Create a public Supabase Storage bucket for business logos and retry to save it to the business record.',
        )
      }
    } catch (error) {
      console.error('Failed to process uploaded logo', error)
      if (previewUrl) {
        revokeObjectUrl(previewUrl)
      }
      setStatusMessage('The file could not be processed. Please try another image.')
    } finally {
      event.target.value = ''
    }
  }

  const handleApplyBranding = async () => {
    setIsSaving(true)
    setStatusMessage('')

    try {
      const nextPalette = buildBrandPalette(primaryColor, accentColor)
      const nextBranding = { logoUrl, palette: nextPalette }

      setPalette(nextPalette)
      saveBrandingForBusiness(business.id, nextBranding)

      if (logoUrl && !logoUrl.startsWith('blob:') && !logoUrl.startsWith('data:')) {
        await updateBusinessLogoUrl(business.id, nextBranding.logoUrl)
        setStatusMessage('Brand colors and logo were saved for this business.')
        return
      }

      setStatusMessage(
        'The palette was saved locally for this business, but the logo is only a temporary preview because no verified Supabase Storage bucket is configured.',
      )
    } catch (error) {
      console.error('Unable to save branding', error)
      setStatusMessage('The palette was stored locally, but the business record could not be updated.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    const fallback = FALLBACK_BRAND_PALETTE
    const fallbackLogo = business.logo_url ?? null
    setLogoUrl(fallbackLogo)
    setPalette(fallback)
    setPrimaryColor(fallback.primary)
    setAccentColor(fallback.accent)
    saveBrandingForBusiness(business.id, { logoUrl: fallbackLogo, palette: fallback })
    applyBrandPalette(fallback)
    setStatusMessage('Branding reset to a safe fallback palette.')
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Brand identity
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Business branding</h2>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <ImageUp className="h-4 w-4" />
          Upload logo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelection}
          className="hidden"
          aria-label="Upload a business logo"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[180px_1fr]">
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
          {logoUrl ? (
            <img src={logoUrl} alt={`${business.name} logo`} className="max-h-28 max-w-full rounded-2xl object-contain" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-slate-200 text-lg font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
              {business.name.slice(0, 2).toUpperCase() || 'BZ'}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Primary color
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(event) => updatePalette(event.target.value, accentColor)}
                  className="h-10 w-12 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  aria-label="Select primary brand color"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{primaryColor.toUpperCase()}</span>
              </div>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Accent color
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => updatePalette(primaryColor, event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  aria-label="Select accent brand color"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{accentColor.toUpperCase()}</span>
              </div>
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Palette preview
            </p>
            <div className="flex items-center gap-2">
              {[palette.primary, palette.accent, palette.highlight, palette.surface].map((swatch) => (
                <span
                  key={swatch}
                  className="h-10 flex-1 rounded-xl border border-slate-200 shadow-sm dark:border-slate-700"
                  style={{ backgroundColor: swatch }}
                  aria-label={`Brand swatch ${swatch}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleApplyBranding} isLoading={isSaving}>
              Apply palette
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset}>
              Reset fallback
            </Button>
          </div>

          {statusMessage ? (
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Sparkles className="h-4 w-4 text-slate-500" />
              {statusMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
