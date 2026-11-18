import { customersOf, type Account } from '../catalog/customer';
import { isRevenue, newestFirst, type Order } from '../catalog/order';
import type { Pet } from '../catalog/pet';
import { CATEGORIES, type Product, type ProductCategory } from '../catalog/product';

const DAY = 86_400_000;
const BUCKETS = 8;

export const DATE_RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 0, label: 'All time' },
] as const;

export interface DashboardData {
  products: Product[];
  pets: Pet[];
  orders: Order[];
  users: Account[];
}

export interface Kpi {
  value: number;
  // Percent change against the previous window of the same length; null for "All time" or no baseline.
  trend: number | null;
  series: number[];
}

export interface DashboardStats {
  label: string;
  pets: Kpi;
  orders: Kpi;
  revenue: Kpi;
  customers: Kpi & { total: number };
  recent: Order[];
  popular: Product[];
  categories: { name: ProductCategory; count: number }[];
}

const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parse = (s: string) => startOfDay(new Date(String(s).slice(0, 10) + 'T00:00:00'));

export function computeDashboardStats({ products, pets, orders, users }: DashboardData, rangeDays: number, now = new Date()): DashboardStats {
  const today = startOfDay(now);
  const end = new Date(today.getTime() + DAY); // exclusive
  const earliest = [...orders.map((o) => o.date), ...pets.map((p) => p.createdAt)]
    .filter((d): d is string => Boolean(d))
    .map(parse)
    .reduce((a, b) => (b < a ? b : a), today);
  const start = rangeDays ? new Date(end.getTime() - rangeDays * DAY) : earliest;
  const span = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span);

  const inWindow = (date: Date, from: Date, to: Date) => date >= from && date < to;
  const valid = orders.filter(isRevenue);
  const orderDate = (o: Order) => parse(o.date);
  const pct = (cur: number, prev: number) => (rangeDays && prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

  const cur = valid.filter((o) => inWindow(orderDate(o), start, end));
  const prev = valid.filter((o) => inWindow(orderDate(o), prevStart, start));
  const revenue = (list: Order[]) => list.reduce((s, o) => s + o.total, 0);
  const activeIds = (list: Order[]) => new Set(list.map((o) => o.userId));

  const bucketBounds = Array.from({ length: BUCKETS }, (_, i) => [
    new Date(start.getTime() + (span * i) / BUCKETS),
    new Date(start.getTime() + (span * (i + 1)) / BUCKETS),
  ] as const);
  const perBucket = (fn: (list: Order[]) => number) =>
    bucketBounds.map(([a, b]) => fn(valid.filter((o) => inWindow(orderDate(o), a, b))));
  const petDate = (p: Pet) => (p.createdAt ? parse(p.createdAt) : earliest);

  const sold: Record<string, number> = {};
  valid.forEach((o) => o.items.forEach((i) => (sold[i.productId] = (sold[i.productId] || 0) + i.qty)));
  const popular = [...products]
    .sort((a, b) => (sold[b.id] || 0) - (sold[a.id] || 0) || String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 4);

  return {
    label: `${fmtDate(start)} – ${fmtDate(today)}`,
    pets: {
      value: pets.length,
      trend: pct(
        pets.filter((p) => inWindow(petDate(p), start, end)).length,
        pets.filter((p) => inWindow(petDate(p), prevStart, start)).length,
      ),
      series: bucketBounds.map(([, b]) => pets.filter((p) => petDate(p) < b).length),
    },
    orders: { value: cur.length, trend: pct(cur.length, prev.length), series: perBucket((l) => l.length) },
    revenue: { value: revenue(cur), trend: pct(revenue(cur), revenue(prev)), series: perBucket(revenue) },
    customers: {
      value: activeIds(cur).size,
      trend: pct(activeIds(cur).size, activeIds(prev).size),
      series: perBucket((l) => activeIds(l).size),
      total: customersOf(users).length,
    },
    recent: [...orders].sort(newestFirst).slice(0, 5),
    popular,
    categories: CATEGORIES.map((c) => ({ name: c, count: products.filter((p) => p.category === c).length })),
  };
}
