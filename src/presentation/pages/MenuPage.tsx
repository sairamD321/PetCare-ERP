import { Button } from '@mantine/core';
import { Suspense, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { isConfiguredUrl } from '@/domain/menu/menu';
import { FullPageLoader, Notice } from '../components/PageState';
import { useAuth } from '../providers/AuthProvider';
import { useMenu } from '../providers/MenuProvider';
import { LazyBlueprintScreen, screenRegistry } from './screenRegistry';

// Pages are loaded on first use; the layout stays on screen while a page's code arrives.
const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={<FullPageLoader />}>{children}</Suspense>;

// Renders whatever the current url points to in the user's backend menu. Only urls that are in the
// menu can be opened, so the backend's profile permissions also control which pages are reachable.
export function MenuPage() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { loading, error, reload, home, findByPath } = useMenu();

  if (pathname === '/' && user?.role === 'user') {
    const CustomerDashboard = screenRegistry['customer-dashboard'];
    return <Lazy><CustomerDashboard /></Lazy>;
  }
  if (loading) return <FullPageLoader />;

  if (error) {
    return (
      <Notice title="Couldn't load your menu" action={<Button onClick={reload}>Try again</Button>}>
        {error}
      </Notice>
    );
  }

  if (!home) {
    return (
      <Notice title="No pages assigned yet">
        Your profile doesn't have any menu items. Please ask an administrator to grant you access.
      </Notice>
    );
  }

  const item = findByPath(pathname);
  if (!item) {
    if (pathname === '/') return <Navigate to={home.href} replace />;
    return (
      <Notice title="Page not found" action={<Button component={Link} to={home.href}>Go to {home.name}</Button>}>
        This page doesn't exist or isn't part of your menu.
      </Notice>
    );
  }

  if (isConfiguredUrl(item.dataTableBluePrintUrl)) return <Lazy><LazyBlueprintScreen key={item.code} item={item} /></Lazy>;

  const Screen = item.screen ? screenRegistry[item.screen] : null;
  if (!Screen) {
    return (
      <Notice title={item.name}>
        This screen ({item.menuName} › {item.name}) isn't available in the app yet.
      </Notice>
    );
  }
  // Keyed by menu item so moving between two items that share a screen starts it fresh.
  return <Lazy><Screen key={item.code} /></Lazy>;
}
