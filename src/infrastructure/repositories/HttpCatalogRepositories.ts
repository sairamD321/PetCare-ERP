import type {
  AccountRepository,
  OrderRepository,
  PetRepository,
  ProductRepository,
  SettingsRepository,
} from '@/application/ports';
import type { Account, ProfilePatch } from '@/domain/catalog/customer';
import type { Order, OrderRequestLine, OrderStatus } from '@/domain/catalog/order';
import type { Pet, PetInput } from '@/domain/catalog/pet';
import type { Product, ProductInput } from '@/domain/catalog/product';
import type { StoreSettings } from '@/domain/catalog/settings';
import { query, type HttpClient } from '../http/HttpClient';

// Endpoints the classic (non-blueprint) screens expect. NOT implemented by the backend yet:
//   GET/POST /products · PATCH/DELETE /products/:id          Product = { id, name, variant, category, price, stock, createdAt }
//   GET /pets[?ownerId=] · POST /pets · DELETE /pets/:id       Pet = { id, name, species, breed, age, ownerId, createdAt }
//   GET /orders[?userId=] · POST /orders { userId, items } · PATCH /orders/:id { status }
//     (the server checks + decrements stock and computes prices/total)
//   GET /users (admin) · PATCH /users/:id { name, phone, address }
//   GET /settings · PUT /settings { storeName, currency, lowStockThreshold }

const item = (path: string, id: string) => `${path}/${encodeURIComponent(id)}`;

export class HttpProductRepository implements ProductRepository {
  private readonly http: HttpClient;
  constructor(http: HttpClient) {
    this.http = http;
  }
  list() {
    return this.http.get<Product[]>('/products');
  }
  create(input: ProductInput) {
    return this.http.post<Product>('/products', input);
  }
  update(id: string, patch: Partial<ProductInput>) {
    return this.http.patch<Product>(item('/products', id), patch);
  }
  remove(id: string) {
    return this.http.delete(item('/products', id));
  }
}

export class HttpPetRepository implements PetRepository {
  private readonly http: HttpClient;
  constructor(http: HttpClient) {
    this.http = http;
  }
  list(ownerId?: string) {
    return this.http.get<Pet[]>(`/pets${query({ ownerId })}`);
  }
  create(input: PetInput) {
    return this.http.post<Pet>('/pets', input);
  }
  remove(id: string) {
    return this.http.delete(item('/pets', id));
  }
}

export class HttpOrderRepository implements OrderRepository {
  private readonly http: HttpClient;
  constructor(http: HttpClient) {
    this.http = http;
  }
  list(userId?: string) {
    return this.http.get<Order[]>(`/orders${query({ userId })}`);
  }
  place(userId: string, items: OrderRequestLine[]) {
    return this.http.post<Order>('/orders', { userId, items });
  }
  setStatus(id: string, status: OrderStatus) {
    return this.http.patch<Order>(item('/orders', id), { status });
  }
}

export class HttpAccountRepository implements AccountRepository {
  private readonly http: HttpClient;
  constructor(http: HttpClient) {
    this.http = http;
  }
  list() {
    return this.http.get<Account[]>('/users');
  }
  update(id: string, patch: ProfilePatch) {
    return this.http.patch<Account>(item('/users', id), patch);
  }
}

export class HttpSettingsRepository implements SettingsRepository {
  private readonly http: HttpClient;
  constructor(http: HttpClient) {
    this.http = http;
  }
  get() {
    return this.http.get<StoreSettings>('/settings');
  }
  save(settings: StoreSettings) {
    return this.http.put<StoreSettings>('/settings', settings);
  }
}
