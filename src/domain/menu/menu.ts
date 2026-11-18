import type { Role } from '../auth/user';
import { screenFor, type ScreenKey } from './screens';

// One link in a backend main menu (GET /users/api/menulinks → subMenuList entry).
export interface MenuLink {
  code: string;
  name: string;
  moduleCode?: string;
  moduleName: string | null;
  accessLevel?: string;
  order: number;
  dataTableBluePrintUrl: string | null;
  searchBluePrintUrl: string | null;
  external: boolean;
  href: string;
  path: string | null;
  search: string;
}

// A backend main menu (folder) with its links, before screens are resolved.
export interface MenuGroup {
  code: string;
  name: string;
  icon: string | null;
  items: MenuLink[];
}

// A link the app can open, resolved against the frontend's built screens.
export interface MenuItem extends MenuLink {
  menuCode: string;
  menuName: string;
  screen: ScreenKey | null;
}

export interface Menu {
  code: string;
  name: string;
  icon: string | null;
  items: MenuItem[];
}

const slug = (v: unknown) => encodeURIComponent(String(v ?? '').trim().toLowerCase());

// Turn a submenu's url into a router target. Absolute paths ("/shop") and http(s) links are used as
// given (http opens in a new tab). Anything else, e.g. a missing url or a placeholder like "string",
// falls back to /<mainMenuCode>/<subMenuCode>, which is unique and stable per item.
export function menuTarget(url: string | null | undefined, mainCode: string, subCode: string) {
  const raw = (url ?? '').trim();
  if (/^https?:\/\//i.test(raw)) return { external: true, href: raw, path: null, search: '' };
  const [pathPart, query = ''] = raw.startsWith('/') ? raw.split('?') : [`/${slug(mainCode)}/${slug(subCode)}`];
  const path = '/' + pathPart.replace(/^\/+|\/+$/g, '');
  const search = query ? `?${query}` : '';
  return { external: false, href: path + search, path, search };
}

// Attach the frontend screen each link opens. A screen's preset params (e.g. ?category=Food) apply
// when the backend url has none.
export function resolveMenus(groups: MenuGroup[], role: Role | undefined): Menu[] {
  return groups.map((m) => ({
    ...m,
    items: m.items.map((i) => {
      const match = i.external ? null : screenFor(i, role);
      const search = i.search || match?.search || '';
      return {
        ...i,
        menuCode: m.code,
        menuName: m.name,
        screen: match?.screen ?? null,
        search,
        href: i.external ? i.href : `${i.path}${search}`,
      };
    }),
  }));
}

const normalPath = (p: string) => (p.replace(/\/+$/, '') || '/').toLowerCase();
export const samePath = (a: string, b: string) => normalPath(a) === normalPath(b);

// An item is active when the url path matches and every query param it defines is present.
export function isItemActive(item: MenuItem, pathname: string, search: string): boolean {
  if (item.external || !item.path || !samePath(item.path, pathname)) return false;
  const current = new URLSearchParams(search);
  return [...new URLSearchParams(item.search)].every(([k, v]) => current.get(k) === v);
}

// Blueprint urls come back as the placeholder "string" when not configured.
export const isConfiguredUrl = (url: unknown): url is string => {
  const value = String(url ?? '').trim();
  return Boolean(value && value.toLowerCase() !== 'string');
};
