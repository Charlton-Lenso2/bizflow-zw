import { Navigate, Outlet, useLocation } from "react-router-dom";
import { SplashScreen } from "../components/ui/SplashScreen";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useBusiness } from "../features/business/hooks/useActiveBusiness";

export function ProtectedRoute() {
  const { session, isLoading: authLoading } = useAuth();
  const {
    businesses,
    isLoading: businessLoading,
  } = useBusiness();

  const location = useLocation();
  const isOnboardingRoute = location.pathname === "/onboarding";

  if (authLoading) {
    return <SplashScreen message="Securing your business workspace..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (businessLoading) {
    return <SplashScreen message="Preparing your business workspace..." />;
  }

  const hasBusiness = businesses.length > 0;

  if (!hasBusiness && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (hasBusiness && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
