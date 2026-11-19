import { Navigate, Outlet } from "react-router-dom";
import { SplashScreen } from "../components/ui/SplashScreen";
import { useAuth } from "../features/auth/hooks/useAuth";

export function ProtectedRoute() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen message="Securing your business workspace..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
