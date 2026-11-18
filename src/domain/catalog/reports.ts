import { isRevenue, type Order } from './order';

export interface SalesReport {
  revenue: number;
  byStatus: Record<string, number>;
  topProducts: { id: string; name: string; qty: number }[];
}

export function salesReport(orders: Order[]): SalesReport {
  const byStatus: Record<string, number> = {};
  const sold: Record<string, { name: string; qty: number }> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    if (!isRevenue(o)) continue;
    for (const i of o.items) {
      sold[i.productId] ??= { name: i.name, qty: 0 };
      sold[i.productId].qty += i.qty;
    }
  }
  return {
    revenue: orders.filter(isRevenue).reduce((s, o) => s + o.total, 0),
    byStatus,
    topProducts: Object.entries(sold).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.qty - a.qty),
  };
}
