import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import SignupSubscriptionProtectedRoute from "./components/SignupSubscriptionProtectedRoute";
import UserLayout from "./components/UserLayout";
import LocaleRedirect from "./components/LocaleRedirect";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Subscription from "./pages/Subscription";
import SignupSubscription from "./pages/SignupSubscription";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import SeriesDetail from "./pages/SeriesDetail";
import CategoryDetail from "./pages/CategoryDetail";
import VideoPlayer from "./pages/VideoPlayer";
import EpisodeDetail from "./pages/EpisodeDetail";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Support from "./pages/Support";
import SacrartKids from "./pages/SacrartKids";
import AdminRoutes from "./pages/admin/AdminRoutes";
import NotFound from "./pages/NotFound";
import { SupportTicketsProvider } from "./contexts/SupportTicketsContext";

const RedirectWithParams = () => {
  const params = useParams<{ id: string }>();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const routeType = segments[0]; // 'series', 'category', or 'video'
    const id = segments[1];
    return <Navigate to={`/en/${routeType}/${id}${location.search}`} replace />;
  }
  return <Navigate to="/en" replace />;
};

const AdminRedirectToLocale = () => {
  const location = useLocation();
  const locale = localStorage.getItem('i18nextLng') || 'en';
  // Remove /admin from path and add locale prefix
  const adminPath = location.pathname.replace('/admin', '');
  return <Navigate to={`/${locale}/admin${adminPath}${location.search}`} replace />;
};


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SupportTicketsProvider>
          <BrowserRouter>
            <Routes>
              {/* Landing page (before auth) - Index will redirect to /es if authenticated */}
              <Route path="/" element={<Index />} />
              
              {/* Root redirect to default locale (for authenticated users) */}
              <Route path="/redirect" element={<LocaleRedirect />} />

              {/* Auth Routes (no locale prefix) */}
              <Route path="/auth" element={<Auth />} />
              
              {/* Signup Subscription Route (no locale prefix, protected - only accessible after registration) */}
              <Route path="/signup-subscription" element={
                <SignupSubscriptionProtectedRoute>
                  <SignupSubscription />
                </SignupSubscriptionProtectedRoute>
              } />

              {/* Locale-prefixed routes */}
              <Route path="/:locale" element={<UserLayout />}>
                <Route index element={<Home />} />
                {/* Signup Subscription Route (with locale prefix, protected - only accessible after registration) */}
                <Route path="signup-subscription" element={
                  <SignupSubscriptionProtectedRoute>
                    <SignupSubscription />
                  </SignupSubscriptionProtectedRoute>
                } />
                <Route path="browse" element={
                  <ProtectedRoute>
                    <Explore />
                  </ProtectedRoute>
                } />
                <Route path="series/:id" element={
                  <ProtectedRoute>
                    <SeriesDetail />
                  </ProtectedRoute>
                } />
                <Route path="category/:id" element={
                  <ProtectedRoute>
                    <CategoryDetail />
                  </ProtectedRoute>
                } />
                <Route path="video/:id" element={
                  <ProtectedRoute>
                    <VideoPlayer />
                  </ProtectedRoute>
                } />
                <Route path="episode/:id" element={
                  <ProtectedRoute>
                    <EpisodeDetail />
                  </ProtectedRoute>
                } />
                <Route path="library" element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                } />
                <Route path="profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="support" element={
                  <ProtectedRoute>
                    <Support />
                  </ProtectedRoute>
                } />
                <Route path="subscription" element={
                  <ProtectedRoute>
                    <Subscription />
                  </ProtectedRoute>
                } />
                <Route path="kids" element={
                  <ProtectedRoute>
                    <SacrartKids />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Admin Routes (with locale prefix, but outside UserLayout to avoid header) */}
              <Route path="/:locale/admin/*" element={
                <AdminProtectedRoute>
                  <AdminRoutes />
                </AdminProtectedRoute>
              } />

              {/* Redirect old admin routes without locale to default locale */}
              <Route path="/admin/*" element={<AdminRedirectToLocale />} />

              {/* Redirect old routes without locale to default locale */}
              <Route path="/explore" element={<Navigate to="/en/browse" replace />} />
              <Route path="/browse" element={<Navigate to="/en/browse" replace />} />
              <Route path="/series/:id" element={<RedirectWithParams />} />
              <Route path="/category/:id" element={<RedirectWithParams />} />
              <Route path="/video/:id" element={<RedirectWithParams />} />
              <Route path="/episode/:id" element={<RedirectWithParams />} />
              <Route path="/library" element={<Navigate to="/en/library" replace />} />
              <Route path="/profile" element={<Navigate to="/en/profile" replace />} />
              <Route path="/support" element={<Navigate to="/en/support" replace />} />
              <Route path="/subscription" element={<Navigate to="/en/subscription" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </SupportTicketsProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
