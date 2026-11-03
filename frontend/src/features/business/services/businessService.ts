import { supabase } from '../../../lib/supabase'
import type { BusinessCreateInput, BusinessMembership, BusinessRecord } from '../types/business'

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

export async function createBusinessRecord(input: BusinessCreateInput, userId: string): Promise<BusinessRecord> {
  const { data, error } = await supabase
    .from('businesses')
    .insert([
      {
        name: input.name,
        business_type: input.business_type,
        phone: input.phone ?? null,
        address: input.address ?? null,
        default_currency: input.default_currency ?? 'USD',
        created_by: userId,
      },
    ])
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as BusinessRecord
}
