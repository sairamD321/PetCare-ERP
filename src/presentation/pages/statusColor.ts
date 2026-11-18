import type { OrderStatus } from '@/domain/catalog/order';

// Badge colour per order status.
export const STATUS_COLOR: Record<OrderStatus, string> = {
  Pending: 'yellow',
  Processing: 'blue',
  Shipped: 'violet',
  Delivered: 'green',
  Cancelled: 'red',
};
