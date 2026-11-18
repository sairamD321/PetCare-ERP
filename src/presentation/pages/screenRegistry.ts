import { lazy, type ComponentType } from 'react';
import type { MenuItem } from '@/domain/menu/menu';
import type { ScreenKey } from '@/domain/menu/screens';

// Screen key (see domain/menu/screens.ts) → page component. Each page is its own chunk, loaded the
// first time it is opened, so a user only downloads the screens their menu actually uses.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const page = <P extends object = object>(load: () => Promise<Record<string, any>>, name: string) =>
  lazy(() => load().then((m) => ({ default: m[name] as ComponentType<P> })));

export const screenRegistry: Record<ScreenKey, ComponentType> = {
  'admin-dashboard': page(() => import('./admin/AdminDashboardPage'), 'AdminDashboardPage'),
  'customer-dashboard': page(() => import('./customer/CustomerDashboardPage'), 'CustomerDashboardPage'),
  products: page(() => import('./admin/ProductsPage'), 'ProductsPage'),
  pets: page(() => import('./admin/PetsPage'), 'PetsPage'),
  orders: page(() => import('./admin/OrdersPage'), 'OrdersPage'),
  customers: page(() => import('./admin/CustomersPage'), 'CustomersPage'),
  inventory: page(() => import('./admin/InventoryPage'), 'InventoryPage'),
  reports: page(() => import('./admin/ReportsPage'), 'ReportsPage'),
  settings: page(() => import('./admin/SettingsPage'), 'SettingsPage'),
  shop: page(() => import('./customer/ShopPage'), 'ShopPage'),
  'my-orders': page(() => import('./customer/MyOrdersPage'), 'MyOrdersPage'),
  profile: page(() => import('./customer/ProfilePage'), 'ProfilePage'),
};

export const LazyBlueprintScreen = page<{ item: MenuItem }>(() => import('../blueprint/BlueprintScreen'), 'BlueprintScreen');
