import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { SignupPage } from '../features/auth/pages/SignupPage'
import { BusinessOnboardingPage } from '../features/business/pages/BusinessOnboardingPage'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { CataloguePage } from '../features/catalogue/pages/CataloguePage'
import { InventoryPage } from '../features/inventory/pages/InventoryPage'
import { useAuth } from '../features/auth/hooks/useAuth'
import { LoadingState } from '../components/ui/LoadingState'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'

function PublicRoute({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingState message="Preparing the application..." />
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />
        <Route
          path="/catalogue"
          element={
            <AppLayout>
              <CataloguePage />
            </AppLayout>
          }
        />
        <Route
          path="/inventory"
          element={
            <AppLayout>
              <InventoryPage />
            </AppLayout>
          }
        />
        <Route
          path="/onboarding"
          element={
            <AppLayout>
              <BusinessOnboardingPage />
            </AppLayout>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
