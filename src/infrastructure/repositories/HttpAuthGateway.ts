import type { AuthGateway } from '@/application/ports';
import type { Credentials, Registration, Session } from '@/domain/auth/user';
import { AppError } from '@/domain/shared/errors';
import type { HttpClient } from '../http/HttpClient';

// Auth endpoints of the backend team's API gateway (see <BACKEND_URL>/docs):
//   POST /users/api/login            { email, password }             → { bearerToken, refreshToken, expiresIn }
//   POST /users/api/CustomerRegister { name, email, phone, password } → { message }   (customer accounts)
// Login doesn't return the user; it is read from the token's claims (see AuthService).
export class HttpAuthGateway implements AuthGateway {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  login(credentials: Credentials): Promise<Session> {
    return this.http.post<Session>('/users/api/login', credentials);
  }

  async register(registration: Registration): Promise<void> {
    await this.http.post('/users/api/CustomerRegister', registration);
  }

  // No password-reset endpoint on the backend yet.
  async requestPasswordReset(): Promise<void> {
    throw new AppError('Password reset is not available yet. Please contact the administrator.', 0);
  }
}
