export type Role = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  profileCode: string | null;
  // Only used to pick between same-named admin/customer screens (see menu/screens.ts); the menu itself
  // comes from the backend. Customer and unknown profiles get customer screens.
  role: Role;
  phone?: string;
  address?: string;
  claims: Record<string, unknown>;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  name: string;
  phone: string;
}

export interface Session {
  bearerToken: string;
  refreshToken?: string;
}

export const MIN_PASSWORD_LENGTH = 6;

const str = (v: unknown): string | undefined => (v == null || v === '' ? undefined : String(v));

// Build the app's user from a token's claims. Returns null when the claims are missing or expired.
// Claim names are matched loosely because the backend's token format isn't documented.
export function userFromClaims(c: Record<string, unknown> | null, fallbackEmail?: string, now = Date.now()): User | null {
  if (!c) return null;
  if (typeof c.exp === 'number' && c.exp * 1000 < now) return null;

  const email = str(c.email) ?? str(c.userEmail) ?? str(c.user_email) ?? fallbackEmail ?? '';
  const profileCode = str(c.profileCode) ?? str(c.profile_code) ?? null;
  const profile = String(profileCode ?? c.profile ?? c.role ?? c.roles ?? '').toLowerCase();
  return {
    id: str(c.userId) ?? str(c.user_id) ?? str(c.id) ?? str(c.sub) ?? email,
    name: str(c.name) ?? str(c.userName) ?? str(c.user_name) ?? str(c.username) ?? (email ? email.split('@')[0] : 'User'),
    email,
    profileCode,
    role: profile && !/customer|user/.test(profile) ? 'admin' : 'user',
    claims: c,
  };
}

export function validateRegistration(form: Registration & { confirm: string }): string | null {
  if (form.password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (form.password !== form.confirm) return 'Passwords do not match';
  return null;
}
