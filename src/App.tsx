import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

import CustomerLayout from "@/components/layouts/CustomerLayout";
import TailorLayout from "@/components/layouts/TailorLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// Eager: landing + auth (small, needed immediately)
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy: everything else (split per-route to shrink initial bundle)
const BecomeTailor = lazy(() => import("./pages/BecomeTailor"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PhoneLogin = lazy(() => import("./pages/PhoneLogin"));
const BrowseTailors = lazy(() => import("./pages/BrowseTailors"));
const TailorProfile = lazy(() => import("./pages/TailorProfile"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const TailorDashboard = lazy(() => import("./pages/TailorDashboard"));
const TailorStore = lazy(() => import("./pages/TailorStore"));
const TailorServices = lazy(() => import("./pages/TailorServices"));
const TailorOrders = lazy(() => import("./pages/TailorOrders"));
const TailorWallet = lazy(() => import("./pages/TailorWallet"));
const TailorWithdraw = lazy(() => import("./pages/TailorWithdraw"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminTailorApprovals = lazy(() => import("./pages/AdminTailorApprovals"));
const AdminWithdrawals = lazy(() => import("./pages/AdminWithdrawals"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminShipments = lazy(() => import("./pages/AdminShipments"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const TailorProfileSettings = lazy(() => import("./pages/TailorProfileSettings"));
const AdminProfileSettings = lazy(() => import("./pages/AdminProfileSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <LoadingSpinner />
  </div>
);

const CustomerLayoutWrapper = () => (
  <CustomerLayout>
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  </CustomerLayout>
);

const SuspenseRoute = () => (
  <Suspense fallback={<RouteFallback />}>
    <Outlet />
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Admin login - standalone page without customer layout */}
              <Route
                path="/admin/login"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminLogin />
                  </Suspense>
                }
              />

              {/* Public + Customer routes */}
              <Route element={<CustomerLayoutWrapper />}>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/login/phone" element={<PhoneLogin />} />
                <Route path="/browse" element={<BrowseTailors />} />
                <Route path="/become-tailor" element={<BecomeTailor />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/tailor/:id" element={<TailorProfile />} />
                <Route path="/service/:id" element={<ServiceDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/order-tracking/:id"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <OrderTracking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute allowedRoles={["customer"]}>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Legacy redirects */}
              <Route path="/tailors" element={<Navigate to="/browse" replace />} />
              <Route path="/tailor-dashboard" element={<Navigate to="/tailor/dashboard" replace />} />
              <Route path="/tailor-dashboard/*" element={<Navigate to="/tailor/dashboard" replace />} />

              {/* Tailor routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={["tailor"]}>
                    <TailorLayout />
                  </ProtectedRoute>
                }
              >
                <Route element={<SuspenseRoute />}>
                <Route path="/tailor/dashboard" element={<TailorDashboard />} />
                <Route path="/tailor/store" element={<TailorStore />} />
                <Route path="/tailor/services" element={<TailorServices />} />
                <Route path="/tailor/orders" element={<TailorOrders />} />
                <Route path="/tailor/wallet" element={<TailorWallet />} />
                <Route path="/tailor/withdraw" element={<TailorWithdraw />} />
                <Route path="/tailor/profile" element={<TailorProfileSettings />} />
                </Route>
              </Route>

              {/* Admin routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route element={<SuspenseRoute />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/tailors" element={<AdminTailorApprovals />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/shipments" element={<AdminShipments />} />
                <Route path="/admin/payments" element={<AdminWithdrawals />} />
                <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/settings" element={<AdminProfileSettings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
