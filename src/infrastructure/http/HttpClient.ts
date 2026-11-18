import { AppError } from '@/domain/shared/errors';
import { API_URL, BACKEND_URL, REQUEST_TIMEOUT_MS, UPLOAD_TIMEOUT_MS } from '../config/env';
import { browserStorage } from '../storage/browserStorage';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface TokenSource {
  token(): string | null;
  expire(): void;
}

const REDIRECTS_KEY = 'pc_api_redirects';

// HTTP client for the PetCare backend (a FastAPI gateway). Sends the bearer token, turns failures into
// readable AppErrors, and on a 401 expires the session.
//
// Identical GETs that are already in flight share one request (StrictMode runs effects twice, and
// several components may ask for the same data at once). `cached` GETs (menu, blueprints) are kept for
// the session, per token; failures are not cached so a retry really retries. Endpoints that redirect
// (FastAPI's /products → /products/) are remembered so later GETs skip the extra round trip; other
// methods always use the exact path they're given (e.g. a form's createApi).
export class HttpClient {
  private readonly tokens: TokenSource;
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly cache = new Map<string, Promise<unknown>>();
  private readonly redirects: Map<string, string>;

  constructor(tokens: TokenSource) {
    this.tokens = tokens;
    this.redirects = new Map(Object.entries(browserStorage.getJson<Record<string, string>>(REDIRECTS_KEY, {})));
  }

  get configured(): boolean {
    return Boolean(API_URL);
  }

  clearCache(): void {
    this.cache.clear();
  }

  get<T>(path: string): Promise<T> {
    const key = `${this.tokens.token() ?? ''} ${path}`;
    let pending = this.inFlight.get(key);
    if (!pending) {
      pending = this.send('GET', path).finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, pending);
    }
    return pending as Promise<T>;
  }

  cached<T>(path: string): Promise<T> {
    const key = `${this.tokens.token() ?? ''} ${path}`;
    let pending = this.cache.get(key);
    if (!pending) {
      pending = this.get(path).catch((error: unknown) => {
        this.cache.delete(key);
        throw error;
      });
      this.cache.set(key, pending);
    }
    return pending as Promise<T>;
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.send('POST', path, body) as Promise<T>;
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.send('PUT', path, body) as Promise<T>;
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.send('PATCH', path, body) as Promise<T>;
  }

  delete(path: string): Promise<void> {
    return this.send('DELETE', path).then(() => undefined);
  }

  private async send(method: HttpMethod, requestedPath: string, body?: unknown): Promise<unknown> {
    // Remembered redirects only rewrite GETs; POST / PUT / DELETE go to the exact path given.
    const path = (method === 'GET' ? this.redirects.get(requestedPath) : undefined) ?? requestedPath;
    if (!this.configured) throw new AppError('No backend connected yet. Set VITE_API_URL in .env.local.', 0);

    const headers: Record<string, string> = { Accept: 'application/json' };
    // FormData (file uploads) sets its own multipart Content-Type with the boundary.
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    const token = this.tokens.token();
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), isForm ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
    let res: Response;
    let data: unknown = null;
    try {
      res = await fetch(API_URL + path, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
        signal: controller.signal,
      });
      if (method === 'GET' && res.ok) this.rememberRedirect(requestedPath, res);
      if (res.status !== 204) {
        try {
          data = await res.json();
        } catch (error) {
          if ((error as Error)?.name === 'AbortError') throw error;
          data = null;
        }
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw new AppError('The server took too long to respond. Please try again.', 0);
      throw new AppError("Can't reach the server. Check your connection and try again.", 0);
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 204) return null;
    if (res.status === 401 && token) {
      this.tokens.expire();
      throw new AppError('Your session has expired. Please sign in again.', 401);
    }
    if (!res.ok) throw new AppError(errorMessage(data, res.status), res.status);
    return data;
  }

  private rememberRedirect(path: string, res: Response): void {
    if (!res.redirected || !res.url) return;
    const final = new URL(res.url, window.location.href);
    const base = new URL(API_URL || '/', window.location.href);
    const basePath = base.pathname.replace(/\/$/, '');
    let finalPath: string | null = null;
    if (final.origin === base.origin && final.pathname.startsWith(basePath)) {
      finalPath = final.pathname.slice(basePath.length) + final.search;
    } else if (BACKEND_URL && final.href.startsWith(BACKEND_URL)) {
      // FastAPI redirects to an absolute backend url (bypassing the dev proxy); map it back.
      finalPath = final.href.slice(BACKEND_URL.length) || '/';
    }
    if (!finalPath || finalPath === path) return;
    this.redirects.set(path, finalPath);
    browserStorage.setJson(REDIRECTS_KEY, Object.fromEntries(this.redirects));
  }
}

// FastAPI errors: { detail: "text" } or { detail: [{ loc: ['body', 'email'], msg: '...' }, ...] }
function errorMessage(data: unknown, status: number): string {
  const d = data as { detail?: unknown; message?: unknown } | null;
  const detail = d?.detail ?? d?.message;
  if (status === 404 && (!detail || detail === 'Not Found')) return 'This feature is not available on the server yet.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((x: { loc?: unknown[]; msg?: string }) => {
        const field = x.loc?.filter((p) => p !== 'body').join('.');
        return field ? `${field}: ${x.msg}` : String(x.msg);
      })
      .join('; ');
  }
  if (status === 404) return 'This feature is not available on the server yet.';
  return `Request failed (${status})`;
}

// Validates a path the backend gave us (blueprint urls) and makes it absolute.
export function apiPath(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'string' || /^(https?:)?\/\//i.test(raw)) {
    throw new AppError('The backend did not provide a valid API path.', 0);
  }
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  if (path.split(/[/?#]/).some((part) => part === '..')) throw new AppError('The backend provided an invalid API path.', 0);
  return path;
}

// Fills {version} (and {recordId}) in a blueprint url and rejects any other placeholder.
export function fillPath(url: unknown, version: string, recordId?: string): string {
  let path = apiPath(url).replace(/\{version\}/gi, encodeURIComponent(version));
  if (recordId !== undefined) path = path.replace(/\{recordId\}/gi, encodeURIComponent(recordId));
  if (/\{[^}]+\}/.test(path)) throw new AppError('The API url contains an unsupported placeholder.', 0);
  return path;
}

export const query = (params: Record<string, unknown>): string => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)]),
  ).toString();
  return s ? `?${s}` : '';
};
