export type BrandPalette = {
  primary: string
  accent: string
  highlight: string
  surface: string
  onPrimary: string
  onAccent: string
}

export type BusinessBranding = {
  logoUrl: string | null
  palette: BrandPalette
}

export const FALLBACK_BRAND_PALETTE: BrandPalette = {
  primary: '#1d4ed8',
  accent: '#f59e0b',
  highlight: '#dbeafe',
  surface: '#f8fafc',
  onPrimary: '#ffffff',
  onAccent: '#0f172a',
}

const STORAGE_PREFIX = 'bizflow-business-branding-'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace('#', '')
  const fullHex = sanitized.length === 3 ? sanitized.split('').map((char) => char + char).join('') : sanitized

  return {
    r: Number.parseInt(fullHex.slice(0, 2), 16),
    g: Number.parseInt(fullHex.slice(2, 4), 16),
    b: Number.parseInt(fullHex.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) => clamp(value, 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixHex(base: string, target: string, weight: number) {
  const start = hexToRgb(base)
  const end = hexToRgb(target)
  const ratio = clamp(weight, 0, 1)

  return rgbToHex(
    Math.round(start.r + (end.r - start.r) * ratio),
    Math.round(start.g + (end.g - start.g) * ratio),
    Math.round(start.b + (end.b - start.b) * ratio),
  )
}

export function getContrastTextColor(background: string): 'white' | 'dark' {
  const { r, g, b } = hexToRgb(background)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.62 ? 'dark' : 'white'
}

function normalizePalette(value: BrandPalette): BrandPalette {
  const primary = value.primary || FALLBACK_BRAND_PALETTE.primary
  const accent = value.accent || FALLBACK_BRAND_PALETTE.accent

  return {
    primary,
    accent,
    highlight: value.highlight || mixHex(primary, '#ffffff', 0.7),
    surface: value.surface || mixHex(primary, '#f8fafc', 0.86),
    onPrimary: value.onPrimary || (getContrastTextColor(primary) === 'dark' ? '#0f172a' : '#ffffff'),
    onAccent: value.onAccent || (getContrastTextColor(accent) === 'dark' ? '#0f172a' : '#ffffff'),
  }
}

export function getBrandStorageKey(businessId: string) {
  return `${STORAGE_PREFIX}${businessId}`
}

export function readStoredBranding(businessId: string | null): BusinessBranding | null {
  if (!businessId || typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(getBrandStorageKey(businessId))

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<BusinessBranding>

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const palette = parsed.palette ? normalizePalette(parsed.palette) : FALLBACK_BRAND_PALETTE

    return {
      logoUrl: typeof parsed.logoUrl === 'string' ? parsed.logoUrl : null,
      palette,
    }
  } catch {
    return null
  }
}

export function saveBrandingForBusiness(businessId: string, branding: BusinessBranding) {
  if (typeof window === 'undefined') {
    return
  }

  const nextBranding: BusinessBranding = {
    logoUrl: branding.logoUrl ?? null,
    palette: normalizePalette(branding.palette),
  }

  window.localStorage.setItem(getBrandStorageKey(businessId), JSON.stringify(nextBranding))
}

export function applyBrandPalette(palette: BrandPalette) {
  if (typeof document === 'undefined') {
    return
  }

  const normalized = normalizePalette(palette)
  const root = document.documentElement

  root.style.setProperty('--brand-primary', normalized.primary)
  root.style.setProperty('--brand-primary-contrast', normalized.onPrimary)
  root.style.setProperty('--brand-accent', normalized.accent)
  root.style.setProperty('--brand-accent-contrast', normalized.onAccent)
  root.style.setProperty('--brand-highlight', normalized.highlight)
  root.style.setProperty('--brand-surface', normalized.surface)
}

export function getBusinessBranding(businessId: string | null, fallbackLogoUrl: string | null = null): BusinessBranding {
  const storedBranding = businessId ? readStoredBranding(businessId) : null

  if (storedBranding) {
    return {
      logoUrl: storedBranding.logoUrl ?? fallbackLogoUrl ?? null,
      palette: storedBranding.palette,
    }
  }

  return {
    logoUrl: fallbackLogoUrl ?? null,
    palette: FALLBACK_BRAND_PALETTE,
  }
}

export function buildBrandPalette(primary: string, accent: string): BrandPalette {
  const normalizedPrimary = primary || FALLBACK_BRAND_PALETTE.primary
  const normalizedAccent = accent || FALLBACK_BRAND_PALETTE.accent
  const primaryContrast = getContrastTextColor(normalizedPrimary) === 'dark' ? '#0f172a' : '#ffffff'
  const accentContrast = getContrastTextColor(normalizedAccent) === 'dark' ? '#0f172a' : '#ffffff'

  return {
    primary: normalizedPrimary,
    accent: normalizedAccent,
    highlight: mixHex(normalizedPrimary, '#e0f2fe', 0.75),
    surface: mixHex(normalizedPrimary, '#f8fafc', 0.82),
    onPrimary: primaryContrast,
    onAccent: accentContrast,
  }
}

export function createPreviewObjectUrl(file: File) {
  return URL.createObjectURL(file)
}

export function revokeObjectUrl(url: string | null) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export async function extractPaletteFromImage(file: File): Promise<BrandPalette> {
  const imageUrl = createPreviewObjectUrl(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Unable to decode the uploaded logo.'))
      element.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      return FALLBACK_BRAND_PALETTE
    }

    const maxSize = 84
    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)

    const pixels = context.getImageData(0, 0, width, height).data
    const bucketMap = new Map<string, number>()

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3]

      if (alpha < 128) {
        continue
      }

      const r = pixels[index]
      const g = pixels[index + 1]
      const b = pixels[index + 2]
      const channelFloor = 24
      const quantized = rgbToHex(
        Math.round(r / channelFloor) * channelFloor,
        Math.round(g / channelFloor) * channelFloor,
        Math.round(b / channelFloor) * channelFloor,
      )

      if (r === g && g === b) {
        continue
      }

      bucketMap.set(quantized, (bucketMap.get(quantized) ?? 0) + 1)
    }

    const dominantColors = [...bucketMap.entries()].sort((left, right) => right[1] - left[1])

    const primary = dominantColors[0]?.[0] ?? FALLBACK_BRAND_PALETTE.primary
    let accent = dominantColors[1]?.[0] ?? mixHex(primary, '#f59e0b', 0.8)

    if (dominantColors.length < 2) {
      accent = mixHex(primary, '#f59e0b', 0.8)
    }

    return buildBrandPalette(primary, accent)
  } catch {
    return FALLBACK_BRAND_PALETTE
  } finally {
    revokeObjectUrl(imageUrl)
  }
}
