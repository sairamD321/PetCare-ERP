export const CATEGORIES = ['Food', 'Medicine', 'Accessories'] as const;
export type ProductCategory = (typeof CATEGORIES)[number];

export interface Product {
  id: string;
  name: string;
  variant?: string;
  category: ProductCategory;
  price: number;
  stock: number;
  createdAt?: string;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt'>;

const NEW_FOR_DAYS = 30;

export type BadgeTone = 'red' | 'orange' | 'blue';

// Badge shown above a storefront product name, derived from real product data only.
export function productBadge(p: Product, now = Date.now()): { label: string; tone: BadgeTone } | null {
  if (p.stock <= 0) return { label: 'Out of stock', tone: 'red' };
  if (p.stock <= 5) return { label: `Only ${p.stock} left`, tone: 'orange' };
  const created = p.createdAt ? Date.parse(p.createdAt) : NaN;
  if (created && now - created < NEW_FOR_DAYS * 864e5) return { label: 'New', tone: 'blue' };
  if (p.category === 'Medicine') return { label: 'Pharmacy', tone: 'red' };
  return null;
}

export type StockLevel = 'out' | 'low' | 'ok';
export const stockLevel = (stock: number, threshold: number): StockLevel =>
  stock <= 0 ? 'out' : stock < threshold ? 'low' : 'ok';

// Featured product per category: in stock first, then newest.
export const featuredIn = (products: Product[], category: ProductCategory): Product | undefined =>
  products
    .filter((p) => p.category === category)
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || String(b.createdAt).localeCompare(String(a.createdAt)))[0];

export function matchesProduct(p: Product, category: string, query: string): boolean {
  return (!category || p.category === category)
    && (!query || `${p.name} ${p.variant ?? ''} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
}
