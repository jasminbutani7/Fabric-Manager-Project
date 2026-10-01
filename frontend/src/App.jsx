import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ManagementProvider } from './context/ManagementContext';
import { useAuth } from './context/useAuth';
import MobileLayout from './components/layout/MobileLayout';

const Home = lazy(() => import('./pages/Home'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Setup = lazy(() => import('./pages/Setup'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Orders = lazy(() => import('./pages/Orders'));
const Transactions = lazy(() => import('./pages/Transactions'));
const MasterPortal = lazy(() => import('./pages/MasterPortal'));
const TailorPortal = lazy(() => import('./pages/TailorPortal'));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

// Route guard for authenticated admin
function ProtectedRoute({ children }) {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  if (currentUser?.role === 'Master') {
    return <Navigate to={`/portal/master/${currentUser.id}`} replace />;
  }
  if (currentUser?.role === 'Tailor') {
    return <Navigate to={`/portal/tailor/${currentUser.id}`} replace />;
  }
  return children;
}

// Route guard to prevent authenticated user from seeing login/signup
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, currentUser } = useAuth();
  if (isAuthenticated) {
    if (currentUser?.role === 'Master') {
      return <Navigate to={`/portal/master/${currentUser.id}`} replace />;
    }
    if (currentUser?.role === 'Tailor') {
      return <Navigate to={`/portal/tailor/${currentUser.id}`} replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/signin"
        element={
          <PublicOnlyRoute>
            <SignIn />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignUp />
          </PublicOnlyRoute>
        }
      />

      {/* Public Worker Portals (No login required, with sub-tab support) */}
      <Route path="/portal/master/:masterId" element={<MasterPortal />} />
      <Route path="/portal/master/:masterId/:tab" element={<MasterPortal />} />
      <Route path="/portal/tailor/:tailorId" element={<TailorPortal />} />
      <Route path="/portal/tailor/:tailorId/:tab" element={<TailorPortal />} />

      {/* Protected Admin Routes within Mobile App Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MobileLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="home" element={<Home />} />
        <Route path="home/:tab" element={<Home />} />
        
        {/* Setup Tab & Sub-tab Endpoints */}
        <Route path="setup" element={<Setup />} />
        <Route path="setup/:tab" element={<Setup />} />

        {/* Fabric Inventory Tab & Aliases */}
        <Route path="fabrics" element={<Inventory />} />
        <Route path="fabrics/:tab" element={<Inventory />} />
        <Route path="fabric" element={<Navigate to="/fabrics" replace />} />
        <Route path="fabric/:tab" element={<Navigate to="/fabrics" replace />} />
        <Route path="inventory" element={<Navigate to="/fabrics" replace />} />
        <Route path="inventory/:tab" element={<Navigate to="/fabrics" replace />} />

        {/* Production / Orders Tab & Sub-tab Endpoints */}
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:tab" element={<Orders />} />
        <Route path="production" element={<Orders />} />
        <Route path="production/:tab" element={<Orders />} />
        <Route path="cut-stitch" element={<Navigate to="/orders" replace />} />
        <Route path="cut-stitch/:tab" element={<Navigate to="/orders" replace />} />

        {/* Unified Transaction Tab & Sub-endpoints (Expenses & Invoices combined) */}
        <Route path="transactions" element={<Transactions />} />
        <Route path="transactions/:tab" element={<Transactions />} />
        <Route path="transactions/:tab/:subtab" element={<Transactions />} />
        <Route path="transaction" element={<Transactions />} />
        <Route path="transaction/:tab" element={<Transactions />} />
        <Route path="transaction/:tab/:subtab" element={<Transactions />} />

        {/* Expenses & Invoices Backward-Compatible Aliases */}
        <Route path="expenses" element={<Transactions />} />
        <Route path="expenses/:subtab" element={<Transactions />} />
        <Route path="invoices" element={<Transactions />} />
        <Route path="invoices/:subtab" element={<Transactions />} />
        <Route path="billing" element={<Transactions />} />
        <Route path="billing/:subtab" element={<Transactions />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ManagementProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoading />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </ManagementProvider>
    </AuthProvider>
  );
}
