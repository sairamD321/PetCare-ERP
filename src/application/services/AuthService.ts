import { userFromClaims, type Credentials, type Registration, type User } from '@/domain/auth/user';
import { AppError } from '@/domain/shared/errors';
import type { AuthGateway, SessionStore, TokenDecoder } from '../ports';

// Sign-in use cases. The backend has no "current user" endpoint, so the user is rebuilt from the
// saved token's claims.
export class AuthService {
  private readonly gateway: AuthGateway;
  private readonly sessions: SessionStore;
  private readonly decode: TokenDecoder;

  constructor(gateway: AuthGateway, sessions: SessionStore, decode: TokenDecoder) {
    this.gateway = gateway;
    this.sessions = sessions;
    this.decode = decode;
  }

  restore(): User | null {
    const token = this.sessions.token();
    const user = token ? userFromClaims(this.decode(token)) : null;
    if (!user) this.sessions.save(null);
    return user;
  }

  async login(credentials: Credentials): Promise<User> {
    const email = credentials.email.trim();
    const session = await this.gateway.login({ email, password: credentials.password });
    const user = userFromClaims(this.decode(session.bearerToken), email);
    if (!user) throw new AppError('Login succeeded but the server returned an unreadable or expired token.');
    this.sessions.save(session);
    return user;
  }

  // Registration only returns a message, so sign in with the same credentials afterwards.
  async register(registration: Registration): Promise<User> {
    await this.gateway.register({
      name: registration.name.trim(),
      email: registration.email.trim(),
      phone: registration.phone.trim(),
      password: registration.password,
    });
    return this.login(registration);
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.gateway.requestPasswordReset(email.trim());
  }

  logout(): void {
    this.sessions.save(null);
  }

  onSessionExpired(listener: () => void): () => void {
    return this.sessions.onExpired(listener);
  }
}
