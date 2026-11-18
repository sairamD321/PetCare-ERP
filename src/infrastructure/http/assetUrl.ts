import type { AssetResolver } from '@/application/ports';
import { BACKEND_URL } from '../config/env';

// Relative paths ("/uploads/…", "uploads\…") get the backend url in front; absolute, data: and blob:
// urls are used as they are.
export const assetUrl: AssetResolver = (path) => {
  const raw = String(path ?? '').trim().replace(/\\/g, '/');
  if (!raw || raw.toLowerCase() === 'string') return '';
  if (/^(https?:|data:|blob:)/i.test(raw) || raw.startsWith('//')) return raw;
  return `${BACKEND_URL}/${raw.replace(/^\/+/, '')}`;
};
