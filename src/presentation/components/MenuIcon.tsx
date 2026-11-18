import {
  IconBell,
  IconBowl,
  IconBox,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconCalendar,
  IconChartBar,
  IconCurrencyRupee,
  IconFolder,
  IconHome,
  IconPaw,
  IconPill,
  IconReceipt,
  IconSettings,
  IconShoppingCart,
  IconUser,
  IconUsers,
  type Icon,
} from '@/presentation/components/icons';

// Backend icon names may be plain ("home"), Font Awesome ("fa-home", "fa fa-home") or Material
// ("shopping_cart"). Map them onto Tabler icons; unknown or missing names show a folder.
const ICONS: Record<string, Icon> = {
  home: IconHome, dashboard: IconHome, house: IconHome,
  box: IconBox, product: IconBox, products: IconBox, package: IconBox, catalog: IconBox,
  receipt: IconReceipt, order: IconReceipt, orders: IconReceipt, invoice: IconReceipt, billing: IconReceipt,
  users: IconUsers, customer: IconUsers, customers: IconUsers, people: IconUsers, group: IconUsers, team: IconUsers,
  user: IconUser, person: IconUser, profile: IconUser, account: IconUser, accountcircle: IconUser,
  inventory: IconBuildingWarehouse, stock: IconBuildingWarehouse, warehouse: IconBuildingWarehouse,
  chart: IconChartBar, report: IconChartBar, reports: IconChartBar, analytics: IconChartBar, barchart: IconChartBar, chartbar: IconChartBar,
  settings: IconSettings, setting: IconSettings, cog: IconSettings, gear: IconSettings, config: IconSettings,
  cart: IconShoppingCart, shoppingcart: IconShoppingCart, shoppingbag: IconShoppingCart,
  store: IconBuildingStore, shop: IconBuildingStore, storefront: IconBuildingStore,
  bell: IconBell, notifications: IconBell, notification: IconBell,
  pill: IconPill, medicine: IconPill, medication: IconPill, pharmacy: IconPill,
  bowl: IconBowl, food: IconBowl,
  calendar: IconCalendar, schedule: IconCalendar, event: IconCalendar, appointments: IconCalendar,
  rupee: IconCurrencyRupee, payment: IconCurrencyRupee, payments: IconCurrencyRupee, money: IconCurrencyRupee,
  paw: IconPaw, pet: IconPaw, pets: IconPaw, dog: IconPaw, cat: IconPaw,
};

const iconKey = (name: unknown) =>
  String(name ?? '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .pop()!
    .replace(/^(fa|fas|far|mdi|bi|icon|ri)[-_]/, '')
    .replace(/[^a-z]/g, '');

// `fallback` (e.g. the main menu's code) is tried when the backend icon is missing or unknown,
// such as the placeholder "string".
export function MenuIcon({ name, fallback, size = 20 }: { name?: string | null; fallback?: string; size?: number }) {
  const Component = ICONS[iconKey(name)] ?? ICONS[iconKey(fallback)] ?? IconFolder;
  return <Component size={size} stroke={1.7} />;
}
