import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveMenus, samePath, type Menu, type MenuGroup, type MenuItem } from '@/domain/menu/menu';
import type { ScreenKey } from '@/domain/menu/screens';
import { errorMessage } from '@/domain/shared/errors';
import { useAuth } from './AuthProvider';
import { useServices } from './ServicesProvider';

interface MenuContextValue {
  menus: Menu[];
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  reload(): void;
  // The first internal link: where "/" goes.
  home: MenuItem | null;
  // The menu item whose url is this path (query strings aren't part of the match).
  findByPath(pathname: string): MenuItem | null;
  // Path of the menu item that opens a screen, or null when this user's menu doesn't include it.
  pathFor(screen: ScreenKey): string | null;
}

const MenuContext = createContext<MenuContextValue | null>(null);

interface LoadState {
  key: string | null;
  groups: MenuGroup[];
  error: string | null;
}
const EMPTY: LoadState = { key: null, groups: [], error: null };

// Loads the signed-in user's navigation from the backend once per session (and again on retry).
// The backend decides which menus each profile gets, so admins and customers receive different lists.
export function MenuProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { menus: menuRepository } = useServices();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>(EMPTY);
  const key = user ? `${user.id}#${attempt}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let live = true;
    menuRepository
      .menus()
      .then((groups) => live && setState({ key, groups, error: null }))
      .catch((e: unknown) => live && setState({ key, groups: [], error: errorMessage(e) }));
    return () => {
      live = false;
    };
  }, [key, menuRepository]);

  const current = state.key === key ? state : EMPTY; // never show a previous user's menu
  const loading = Boolean(key) && state.key !== key;
  const role = user?.role;
  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  const value = useMemo<MenuContextValue>(() => {
    const menus = resolveMenus(current.groups, role);
    const items = menus.flatMap((m) => m.items);
    const internal = items.filter((i) => !i.external && i.path);
    return {
      menus,
      items,
      loading,
      error: current.error,
      reload,
      home: internal[0] ?? null,
      findByPath: (pathname) => internal.find((i) => samePath(i.path!, pathname)) ?? null,
      pathFor: (screen) => internal.find((i) => i.screen === screen)?.path ?? null,
    };
  }, [current.groups, current.error, loading, role, reload]);

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used inside <MenuProvider>.');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useScreenPath = (screen: ScreenKey): string | null => useMenu().pathFor(screen);
