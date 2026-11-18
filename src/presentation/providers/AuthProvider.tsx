import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Credentials, Registration, User } from '@/domain/auth/user';
import { useServices } from './ServicesProvider';

interface AuthContextValue {
  user: User | null;
  login(credentials: Credentials): Promise<User>;
  register(registration: Registration): Promise<User>;
  requestPasswordReset(email: string): Promise<void>;
  logout(): void;
  // Lets pages (e.g. Profile) reflect saved changes without a reload.
  updateUser(patch: Partial<User>): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const [user, setUser] = useState<User | null>(() => auth.restore());

  // Any authenticated request that gets a 401 expires the session; sign out here too.
  useEffect(() => auth.onSessionExpired(() => setUser(null)), [auth]);

  const login = useCallback(async (c: Credentials) => {
    const u = await auth.login(c);
    setUser(u);
    return u;
  }, [auth]);

  const register = useCallback(async (r: Registration) => {
    const u = await auth.register(r);
    setUser(u);
    return u;
  }, [auth]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    login,
    register,
    requestPasswordReset: (email) => auth.requestPasswordReset(email),
    logout: () => {
      auth.logout();
      setUser(null);
    },
    updateUser: (patch) => setUser((u) => (u ? { ...u, ...patch } : u)),
  }), [auth, user, login, register]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}

// For screens behind the protected route, where a user is guaranteed.
// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser is only available to signed-in screens.');
  return user;
}
