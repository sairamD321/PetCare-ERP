import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addToCart, cartCount, cartSubtotal, removeLine, setLineQty, toOrderLines, type CartLine } from '@/domain/cart/cart';
import type { Product } from '@/domain/catalog/product';
import { useCurrentUser } from './AuthProvider';
import { useServices } from './ServicesProvider';

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add(product: Product): void;
  setQty(productId: string, qty: number): void;
  remove(productId: string): void;
  checkout(): Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

// Customer cart, shared by the store header (badge + popover), the home page and the shop.
// Saved per user, so mount it with key={user.id}.
export function CartProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const { cartStorage, orders } = useServices();
  const [lines, setLines] = useState<CartLine[]>(() => cartStorage.load(user.id));

  useEffect(() => cartStorage.save(user.id, lines), [cartStorage, user.id, lines]);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    count: cartCount(lines),
    subtotal: cartSubtotal(lines),
    add: (p) => setLines((ls) => addToCart(ls, p)),
    setQty: (productId, qty) => setLines((ls) => setLineQty(ls, productId, qty)),
    remove: (productId) => setLines((ls) => removeLine(ls, productId)),
    checkout: async () => {
      await orders.place(user.id, toOrderLines(lines));
      setLines([]);
    },
  }), [lines, orders, user.id]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>.');
  return ctx;
}
