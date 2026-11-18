export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderLine {
  productId: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderLine[];
  total: number;
  status: OrderStatus;
  date: string;
  createdAt?: string;
}

// What a customer or admin asks for; the server checks stock and computes prices and the total.
export interface OrderRequestLine {
  productId: string;
  qty: number;
}

export const itemCount = (o: Order): number => o.items.reduce((s, i) => s + i.qty, 0);
export const describeItems = (o: Order): string => o.items.map((i) => `${i.name} × ${i.qty}`).join(', ');
export const newestFirst = (a: Order, b: Order): number =>
  String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date));
export const isRevenue = (o: Order): boolean => o.status !== 'Cancelled';

// Validates admin-entered order lines; returns the lines to send or an error message.
export function prepareOrderLines(lines: { productId: string; qty: number }[]): OrderRequestLine[] | string {
  const cart = lines.filter((l) => l.productId && l.qty > 0).map((l) => ({ productId: l.productId, qty: Number(l.qty) }));
  if (!cart.length) return 'Add at least one product';
  if (new Set(cart.map((l) => l.productId)).size !== cart.length) return 'Each product can only appear once';
  return cart;
}
