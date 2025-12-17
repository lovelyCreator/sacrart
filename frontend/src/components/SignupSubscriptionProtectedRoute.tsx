import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SignupSubscriptionProtectedRouteProps {
  children: React.ReactNode;
}

const SignupSubscriptionProtectedRoute = ({ children }: SignupSubscriptionProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is already authenticated (shouldn't be on signup subscription page)
  if (isAuthenticated) {
    const locale = localStorage.getItem('i18nextLng') || 'en';
    return <Navigate to={`/${locale}`} replace />;
  }

  // Check if signup data exists in location state
  const signupData = location.state as { email: string; password: string; name: string } | null;
  
  if (!signupData || !signupData.email || !signupData.password || !signupData.name) {
    // No signup data, redirect to auth page
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default SignupSubscriptionProtectedRoute;

