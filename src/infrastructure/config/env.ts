// Runtime configuration from .env.local (see .env.example and vite.config.ts).

// Base path of the backend API. In development this is /api, which the Vite dev server proxies.
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

// Backend server that serves uploaded files (e.g. /uploads/products/x.jpg). Taken from BACKEND_URL
// in .env.local (see vite.config.ts); VITE_BACKEND_URL overrides it.
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/+$/, '');

export const REQUEST_TIMEOUT_MS = 15_000;

// Requests that upload files (multipart). Images through a slow tunnel (loca.lt) can take ~10–15 s per MB.
export const UPLOAD_TIMEOUT_MS = 180_000;
