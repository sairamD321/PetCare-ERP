import type {
  AccountRepository,
  AssetResolver,
  BlueprintRepository,
  CartStorage,
  MenuRepository,
  OrderRepository,
  PetRepository,
  ProductRepository,
  RecordRepository,
  SettingsRepository,
} from './ports';
import type { AuthService } from './services/AuthService';

// Everything the UI may use, wired together in app/container.ts.
export interface Services {
  auth: AuthService;
  menus: MenuRepository;
  blueprints: BlueprintRepository;
  records: RecordRepository;
  products: ProductRepository;
  pets: PetRepository;
  orders: OrderRepository;
  accounts: AccountRepository;
  settings: SettingsRepository;
  cartStorage: CartStorage;
  assetUrl: AssetResolver;
}
