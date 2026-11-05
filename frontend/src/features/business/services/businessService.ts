
import { supabase } from '../../../lib/supabase'
import type { BusinessCreateInput, BusinessMembership, BusinessRecord } from '../types/business'

export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024
export const ACCEPTED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function validateBusinessLogoFile(file: File): string | null {
  if (!file.type || !ACCEPTED_LOGO_TYPES.has(file.type)) {
    return 'Unsupported file type. Please upload a PNG, JPG, or WebP logo.'
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    return 'Logo is too large. Please upload an image under 2MB.'
  }

  return null
}

export async function getConfiguredStorageBucket(): Promise<string | null> {
  const { data, error } = await supabase.storage.listBuckets()

  if (error) {
    throw error
  }

  const preferredBucket = data?.find(
    (bucket) => bucket.public && /(business|logo|brand|asset)/i.test(bucket.name),
  )

  return preferredBucket?.name ?? null
}

export async function uploadBusinessLogoForBusiness(businessId: string, file: File): Promise<string> {
  const validationMessage = validateBusinessLogoFile(file)

  if (validationMessage) {
    throw new Error(validationMessage)
  }

  const bucketName = await getConfiguredStorageBucket()

  if (!bucketName) {
    throw new Error(
      'No verified public Supabase Storage bucket is configured for business logos. Create one in your Supabase project, then retry.',
    )
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const objectPath = `businesses/${businessId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage.from(bucketName).upload(objectPath, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath)

  if (!data?.publicUrl) {
    throw new Error('The uploaded logo could not be resolved to a public URL.')
  }

  return data.publicUrl
}

export async function fetchBusinessMembershipsForUser(userId: string): Promise<BusinessMembership[]> {
  const { data, error } = await supabase
    .from('business_members')
    .select(
      'id, business_id, user_id, role, is_active, created_at, businesses(id, name, business_type, phone, address, logo_url, default_currency, created_by, created_at, updated_at)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => {
    const businessRow = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses

    return {
      ...row,
      businesses: businessRow ?? null,
    } as BusinessMembership
  })
}

export async function createBusinessRecord(input: BusinessCreateInput): Promise<BusinessRecord> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You must be signed in to create a business.')
  }

  const businessId = crypto.randomUUID()

  const payload = {
    id: businessId,
    name: input.name,
    business_type: input.business_type,
    phone: input.phone ?? null,
    address: input.address ?? null,
    default_currency: input.default_currency ?? 'USD',
    created_by: user.id,
  }

  const { error: insertError } = await supabase
    .from('businesses')
    .insert([payload])

  if (insertError) {
    throw insertError
  }

  const { data, error: fetchError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  return data as BusinessRecord
}

export async function updateBusinessLogoUrl(businessId: string, logoUrl: string | null): Promise<void> {
  if (!logoUrl || logoUrl.startsWith('blob:') || logoUrl.startsWith('data:')) {
    throw new Error('Only a persisted public storage URL can be saved to businesses.logo_url.')
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId)

  if (error) {
    throw error
  }
}
