import { Navigate, Outlet } from 'react-router-dom'
import { LoadingState } from '../components/ui/LoadingState'
import { useAuth } from '../features/auth/hooks/useAuth'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingState message="Checking your session..." />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
