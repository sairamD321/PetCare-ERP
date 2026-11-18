import type { Credentials, Registration, Session } from '@/domain/auth/user';
import type { CartLine } from '@/domain/cart/cart';
import type { Account, ProfilePatch } from '@/domain/catalog/customer';
import type { Order, OrderRequestLine, OrderStatus } from '@/domain/catalog/order';
import type { Pet, PetInput } from '@/domain/catalog/pet';
import type { Product, ProductInput } from '@/domain/catalog/product';
import type { StoreSettings } from '@/domain/catalog/settings';
import type { DataTableBlueprint, SearchBlueprint } from '@/domain/blueprint/dataTable';
import type { MenuGroup } from '@/domain/menu/menu';

// Ports: what the application needs from the outside world. Infrastructure implements them; the UI
// receives them through the services container and never talks to fetch/localStorage directly.

export interface AuthGateway {
  login(credentials: Credentials): Promise<Session>;
  register(registration: Registration): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
}

export interface SessionStore {
  token(): string | null;
  save(session: Session | null): void;
  // Calls back when the server rejects the saved token (401). Returns an unsubscribe function.
  onExpired(listener: () => void): () => void;
}

// Reads a token's claims without verifying it (verification is the server's job).
export type TokenDecoder = (token: string) => Record<string, unknown> | null;

export interface MenuRepository {
  menus(): Promise<MenuGroup[]>;
}

export interface BlueprintRepository {
  // Blueprints describe a screen's layout and don't change during a session: fetched once and cached.
  // `version` fills a {version} placeholder in the url.
  get<T = unknown>(url: string, version?: string): Promise<T>;
  // One page (0-based index) of a paged list api such as dropdown options; cached per page.
  page(url: string, version: string, index: number, size: number): Promise<{ items: unknown[]; hasNext: boolean }>;
  // Records of a data-table screen, optionally filtered through its search blueprint.
  list(table: DataTableBlueprint, params: Record<string, string>, search: SearchBlueprint | null): Promise<unknown>;
}

// Create / read / update / delete through the urls a blueprint gives
// (e.g. "products/platform/{version}/api/products/{recordId}").
export interface RecordRepository {
  create(url: string, version: string, body: FormData): Promise<unknown>;
  get(url: string, version: string, recordId: string): Promise<unknown>;
  update(url: string, version: string, recordId: string, changes: Record<string, unknown>): Promise<unknown>;
  remove(url: string, version: string, recordId: string): Promise<void>;
}

export interface ProductRepository {
  list(): Promise<Product[]>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, patch: Partial<ProductInput>): Promise<Product>;
  remove(id: string): Promise<void>;
}

export interface PetRepository {
  list(ownerId?: string): Promise<Pet[]>;
  create(input: PetInput): Promise<Pet>;
  remove(id: string): Promise<void>;
}

export interface OrderRepository {
  list(userId?: string): Promise<Order[]>;
  place(userId: string, items: OrderRequestLine[]): Promise<Order>;
  setStatus(id: string, status: OrderStatus): Promise<Order>;
}

export interface AccountRepository {
  list(): Promise<Account[]>;
  update(id: string, patch: ProfilePatch): Promise<Account>;
}

export interface SettingsRepository {
  get(): Promise<StoreSettings>;
  save(settings: StoreSettings): Promise<StoreSettings>;
}

export interface CartStorage {
  load(userId: string): CartLine[];
  save(userId: string, lines: CartLine[]): void;
}

// Full url for an image path the backend returns ("/uploads/…").
export type AssetResolver = (path: string) => string;
