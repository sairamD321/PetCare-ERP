import type { SessionStore } from '@/application/ports';
import type { Session } from '@/domain/auth/user';
import { browserStorage } from './browserStorage';

const TOKEN_KEY = 'pc_token';
const REFRESH_KEY = 'pc_refresh_token';

// Bearer token kept in localStorage so a refresh keeps the user signed in.
export class LocalSessionStore implements SessionStore {
  private readonly expiredListeners = new Set<() => void>();
  private readonly changeListeners = new Set<() => void>();

  token(): string | null {
    return browserStorage.get(TOKEN_KEY);
  }

  save(session: Session | null): void {
    browserStorage.set(TOKEN_KEY, session?.bearerToken ?? null);
    browserStorage.set(REFRESH_KEY, session?.refreshToken ?? null);
    this.changeListeners.forEach((l) => l());
  }

  // The server rejected the token: forget it and tell whoever is listening (the auth provider).
  expire(): void {
    this.save(null);
    this.expiredListeners.forEach((l) => l());
  }

  onExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => this.expiredListeners.delete(listener);
  }

  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }
}
