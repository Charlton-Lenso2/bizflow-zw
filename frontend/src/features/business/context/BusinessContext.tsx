import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { createBusinessRecord, fetchBusinessMembershipsForUser } from '../services/businessService'
import type { BusinessContextValue, BusinessCreateInput, BusinessMembership, BusinessRecord } from '../types/business'

const BUSINESS_STORAGE_KEY = 'bizflow-active-business-id'

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined)

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const userId = user?.id
  const [businesses, setBusinesses] = useState<BusinessMembership[]>([])
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)

  const refreshBusinesses = useCallback(async () => {
    if (!userId) {
      return
    }

    try {
      setIsLoadingData(true)
      const memberships = await fetchBusinessMembershipsForUser(userId)
      const validMemberships = memberships.filter((membership) => membership.businesses)

      setBusinesses(validMemberships)

      setActiveBusinessId((current) => {
        const selectedStillValid = current
          ? validMemberships.some((membership) => membership.business_id === current)
          : false

        if (selectedStillValid) {
          return current
        }

        const nextSelection = validMemberships[0]?.business_id ?? null

        if (typeof window !== 'undefined') {
          if (nextSelection) {
            window.localStorage.setItem(BUSINESS_STORAGE_KEY, nextSelection)
          } else {
            window.localStorage.removeItem(BUSINESS_STORAGE_KEY)
          }
        }

        return nextSelection
      })
    } catch (error) {
      console.error('Failed to refresh business memberships', error)
      setBusinesses([])
      setActiveBusinessId(null)
    } finally {
      setIsLoadingData(false)
    }
  }, [userId])

  useEffect(() => {
    if (authLoading || !userId) {
      return
    }

    let isMounted = true

    const loadMemberships = async () => {
      setIsLoadingData(true)

      try {
        const memberships = await fetchBusinessMembershipsForUser(userId)

        if (!isMounted) {
          return
        }

        const validMemberships = memberships.filter((membership) => membership.businesses)
        setBusinesses(validMemberships)

        const persistedBusinessId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(BUSINESS_STORAGE_KEY)
            : null

        const preferredBusiness =
          persistedBusinessId && validMemberships.some((membership) => membership.business_id === persistedBusinessId)
            ? persistedBusinessId
            : validMemberships[0]?.business_id ?? null

        setActiveBusinessId(preferredBusiness)

        if (typeof window !== 'undefined') {
          if (preferredBusiness) {
            window.localStorage.setItem(BUSINESS_STORAGE_KEY, preferredBusiness)
          } else {
            window.localStorage.removeItem(BUSINESS_STORAGE_KEY)
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load business memberships', error)
          setBusinesses([])
          setActiveBusinessId(null)
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false)
        }
      }
    }

    void loadMemberships()

    return () => {
      isMounted = false
    }
  }, [authLoading, userId])

  const selectBusiness = (businessId: string | null) => {
    setActiveBusinessId(businessId)

    if (typeof window !== 'undefined') {
      if (businessId) {
        window.localStorage.setItem(BUSINESS_STORAGE_KEY, businessId)
      } else {
        window.localStorage.removeItem(BUSINESS_STORAGE_KEY)
      }
    }
  }

  const createBusiness = useCallback(
    async (input: BusinessCreateInput): Promise<BusinessRecord | null> => {
      if (!userId) {
        return null
      }

      const createdBusiness = await createBusinessRecord(input)
      await refreshBusinesses()
      setActiveBusinessId(createdBusiness.id)

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(BUSINESS_STORAGE_KEY, createdBusiness.id)
      }

      return createdBusiness
    },
    [refreshBusinesses, userId],
  )

  const isLoading = authLoading || (userId ? isLoadingData : false)

  const activeBusiness = useMemo(() => {
    if (!userId) {
      return null
    }

    return businesses.find((membership) => membership.business_id === activeBusinessId)?.businesses ?? null
  }, [activeBusinessId, businesses, userId])

  const value = useMemo<BusinessContextValue>(
    () => ({
      businesses: userId ? businesses : [],
      activeBusiness,
      activeBusinessId: userId ? activeBusinessId : null,
      isLoading,
      selectBusiness,
      refreshBusinesses,
      createBusiness,
    }),
    [activeBusiness, activeBusinessId, businesses, createBusiness, isLoading, refreshBusinesses, userId],
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBusiness(): BusinessContextValue {
  const context = useContext(BusinessContext)

  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider.')
  }

  return context
}
