import type { Role } from '../auth/user';

// Which built screen a backend menu item opens.
//
// The menu (folder names, links, order, urls) comes entirely from GET /users/menulinks. The frontend
// only decides which screen renders at an item's url. An item is matched by its moduleCode, then its
// subMenuCode, then the last segment of its url, then its name (compared lowercase, letters and digits
// only). `role` limits a screen to admin or customer menus where the same word means different screens,
// e.g. "orders" is the order desk for admins and "My Orders" for customers. `search` presets query
// params, e.g. the Food submenu opens Products filtered to Food.
//
// Items with no matching screen still appear in the menu and open a "coming soon" page. When the
// backend adds a module, add its code to `match` here and its page in presentation/pages/screenRegistry.
export type ScreenKey =
  | 'admin-dashboard'
  | 'customer-dashboard'
  | 'products'
  | 'pets'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'reports'
  | 'settings'
  | 'shop'
  | 'my-orders'
  | 'profile';

interface ScreenRule {
  screen: ScreenKey;
  role?: Role;
  match: string[];
  search?: string;
}

const SCREENS: ScreenRule[] = [
  { screen: 'admin-dashboard', role: 'admin', match: ['dashboard', 'home', 'admindashboard'] },
  { screen: 'customer-dashboard', role: 'user', match: ['dashboard', 'home', 'customerdashboard', 'mydashboard'] },
  { screen: 'products', role: 'admin', match: ['food'], search: '?category=Food' },
  { screen: 'products', role: 'admin', match: ['medicine'], search: '?category=Medicine' },
  { screen: 'products', role: 'admin', match: ['accessories'], search: '?category=Accessories' },
  { screen: 'products', role: 'admin', match: ['products', 'product', 'productmanagement', 'catalog', 'catalogue'] },
  { screen: 'pets', role: 'admin', match: ['pets', 'pet', 'petmanagement'] },
  { screen: 'my-orders', match: ['myorder', 'myorders'] },
  { screen: 'orders', role: 'admin', match: ['orders', 'order', 'ordermanagement'] },
  { screen: 'customers', role: 'admin', match: ['customers', 'customer', 'customermanagement', 'users', 'user'] },
  { screen: 'inventory', role: 'admin', match: ['inventory', 'stock'] },
  { screen: 'reports', role: 'admin', match: ['reports', 'report', 'analytics'] },
  { screen: 'settings', role: 'admin', match: ['settings', 'setting', 'storesettings', 'configuration'] },
  { screen: 'shop', role: 'user', match: ['shop', 'store', 'products', 'product', 'food', 'medicine', 'accessories'] },
  { screen: 'my-orders', role: 'user', match: ['orders', 'order', 'orderhistory'] },
  // For admins "profile(s)" is role/permission management, not the personal profile page.
  { screen: 'profile', role: 'user', match: ['profile', 'myprofile', 'account', 'myaccount'] },
];

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

interface Matchable {
  moduleCode?: string;
  code: string;
  path: string | null;
  name: string;
}

// → { screen, search } or null when the frontend has no screen for this item yet.
export function screenFor(item: Matchable, role: Role | undefined): { screen: ScreenKey; search: string } | null {
  const lastSegment = item.path?.split('/').filter(Boolean).pop();
  const candidates = [item.moduleCode, item.code, lastSegment, item.name].map(norm).filter(Boolean);
  for (const word of candidates) {
    const hit = SCREENS.find((s) => (!s.role || s.role === role) && s.match.includes(word));
    if (hit) return { screen: hit.screen, search: hit.search ?? '' };
  }
  return null;
}
