import type { Role } from '../auth/user';
import type { Order } from './order';
import type { Pet } from './pet';

// A user account as the /users endpoint lists it.
export interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  address?: string;
}

export interface ProfilePatch {
  name: string;
  phone: string;
  address: string;
}

export interface CustomerSummary extends Account {
  pets: number;
  orders: number;
  spent: number;
}

export const customersOf = (accounts: Account[]): Account[] => accounts.filter((u) => u.role === 'user');

export function summarizeCustomers(accounts: Account[], pets: Pet[], orders: Order[]): CustomerSummary[] {
  return customersOf(accounts).map((u) => {
    const own = orders.filter((o) => o.userId === u.id);
    return {
      ...u,
      pets: pets.filter((p) => p.ownerId === u.id).length,
      orders: own.length,
      spent: own.reduce((s, o) => s + o.total, 0),
    };
  });
}
