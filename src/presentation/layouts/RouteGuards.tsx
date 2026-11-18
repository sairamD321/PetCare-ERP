import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { FullPageLoader } from '../components/PageState';
import { useAuth } from '../providers/AuthProvider';

// Each audience downloads only its own shell.
const AdminLayout = lazy(() => import('./AdminLayout').then((m) => ({ default: m.AdminLayout })));
const StoreLayout = lazy(() => import('./StoreLayout').then((m) => ({ default: m.StoreLayout })));

// Signed-in users only. Which pages they can open is decided by their backend menu (see MenuPage).
export function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

// Login / register / forgot password are only for signed-out visitors.
export function GuestOnly() {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

// Customers get the storefront (top navigation bar); admins and other profiles keep the sidebar layout.
export function RoleLayout() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<FullPageLoader />}>
      {user?.role === 'user' ? <StoreLayout /> : <AdminLayout />}
    </Suspense>
  );
}
