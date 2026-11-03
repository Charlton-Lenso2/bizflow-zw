import { useBusiness as useBusinessContext } from '../context/BusinessContext'

export function useActiveBusiness() {
  return useBusinessContext()
}

export const useBusiness = useActiveBusiness
