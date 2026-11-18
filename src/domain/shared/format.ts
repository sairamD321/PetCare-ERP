import type { ProductCategory } from '../catalog/product';

// Display helpers shared across screens.
export const inr = (n: number | string | null | undefined): string => '₹' + Number(n || 0).toLocaleString('en-IN');

// "499" → ₹499, "499.5" → ₹499.50.
export function price(value: number | string): string {
  const n = Number(value);
  return Number.isInteger(n) ? inr(n) : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const orderCode = (id: string | number): string => `#${String(id).slice(0, 6).toUpperCase()}`;

export const categoryEmoji: Record<ProductCategory, string> = { Food: '🍖', Medicine: '💊', Accessories: '🎾' };
export const productEmoji = (p: { category?: string } | null | undefined): string =>
  categoryEmoji[p?.category as ProductCategory] ?? '📦';

export const initials = (name = ''): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
