import type { Product } from '../catalog/product';
import type { OrderRequestLine } from '../catalog/order';

// A cart line keeps a snapshot of the product so the cart can render without refetching products.
export interface CartLine {
  productId: string;
  name: string;
  variant?: string;
  category: Product['category'];
  price: number;
  stock: number;
  qty: number;
}

export function addToCart(lines: CartLine[], p: Product): CartLine[] {
  const line = lines.find((l) => l.productId === p.id);
  if (!line) {
    const { id, name, variant, category, price, stock } = p;
    return [...lines, { productId: id, name, variant, category, price, stock, qty: 1 }];
  }
  return lines.map((l) => (l.productId === p.id ? { ...l, stock: p.stock, qty: Math.min(l.qty + 1, p.stock) } : l));
}

export const setLineQty = (lines: CartLine[], productId: string, qty: number): CartLine[] =>
  lines.map((l) => (l.productId === productId ? { ...l, qty: Math.max(1, Math.min(qty, l.stock)) } : l));

export const removeLine = (lines: CartLine[], productId: string): CartLine[] => lines.filter((l) => l.productId !== productId);

export const cartCount = (lines: CartLine[]): number => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]): number => lines.reduce((s, l) => s + l.price * l.qty, 0);
export const toOrderLines = (lines: CartLine[]): OrderRequestLine[] => lines.map(({ productId, qty }) => ({ productId, qty }));
