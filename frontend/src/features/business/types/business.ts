export type BusinessCurrency = 'USD' | 'ZWG'

export type BusinessRole = 'owner' | 'administrator' | 'manager' | 'cashier'

export type BusinessRecord = {
  id: string
  name: string
  business_type: string
  phone: string | null
  address: string | null
  logo_url: string | null
  default_currency: BusinessCurrency | string
  created_by: string
  created_at: string
  updated_at: string
}

export type BusinessMembership = {
  id: string
  business_id: string
  user_id: string
  role: BusinessRole
  is_active: boolean
  created_at: string
  businesses: BusinessRecord | null
}

export type BusinessCreateInput = {
  name: string
  business_type: string
  phone?: string
  address?: string
  default_currency?: BusinessCurrency
}

export type BusinessContextValue = {
  businesses: BusinessMembership[]
  activeBusiness: BusinessRecord | null
  activeBusinessId: string | null
  isLoading: boolean
  selectBusiness: (businessId: string | null) => void
  refreshBusinesses: () => Promise<void>
  createBusiness: (input: BusinessCreateInput) => Promise<BusinessRecord | null>
}
