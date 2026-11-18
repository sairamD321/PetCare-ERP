import type { CartStorage } from '@/application/ports';
import type { CartLine } from '@/domain/cart/cart';
import { browserStorage } from './browserStorage';

// Cart saved per user so a refresh doesn't empty it.
export class LocalCartStorage implements CartStorage {
  load(userId: string): CartLine[] {
    const saved = browserStorage.getJson<unknown>(`pc_cart_${userId}`, []);
    return Array.isArray(saved) ? (saved as CartLine[]) : [];
  }

  save(userId: string, lines: CartLine[]): void {
    browserStorage.setJson(`pc_cart_${userId}`, lines);
  }
}
