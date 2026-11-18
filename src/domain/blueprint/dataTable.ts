import { price } from '../shared/format';

// A screen described by a data-table blueprint (menu item → dataTableBluePrintUrl) and an optional
// search blueprint (searchBluePrintUrl).

export type BlueprintRecord = Record<string, unknown>;

export interface GridColumn {
  field: string;
  displayName?: string;
  mobileDisplay?: boolean;
  [flag: string]: unknown;
}

export interface BlueprintAction {
  action?: string;
  displayName?: string;
  iconName?: string;
  iconToolTip?: string;
  blueprintApi?: string;
  dataApi?: string;
  enabled?: boolean;
  visible?: boolean;
}

export type DisplayMode = 'cards' | 'table';

export interface DataTableBlueprint {
  dataGrid: GridColumn[];
  dataApi?: string;
  version?: string;
  apiVersion?: string;
  mappings?: { recordId?: string };
  enableSearch?: boolean;
  enableActions?: boolean;
  enableMultipleDisplayModes?: boolean;
  defaultDisplayMode?: string;
  availableDisplayModes?: { value: string; label: string }[];
  actions?: BlueprintAction[];
  rowLevelactions?: BlueprintAction[];
  rowLevelActions?: BlueprintAction[];
  rowActions?: BlueprintAction[];
}

export interface SearchField {
  field: string;
  displayName: string;
  type?: string;
}

export interface SearchBlueprint {
  dataApi?: string;
  searchApi?: string;
  searchFields?: unknown[];
  fields?: unknown[];
  filters?: unknown[];
}

// Version used to fill {version} in blueprint urls.
export const apiVersion = (b: { version?: string; apiVersion?: string } | null | undefined): string =>
  b?.version ?? b?.apiVersion ?? 'v1';

export function recordList(response: unknown): BlueprintRecord[] | null {
  if (Array.isArray(response)) return response as BlueprintRecord[];
  const r = response as Record<string, unknown> | null;
  for (const key of ['records', 'items', 'data', 'results']) {
    if (Array.isArray(r?.[key])) return r[key] as BlueprintRecord[];
  }
  return null;
}

export function searchFields(blueprint: SearchBlueprint | null): SearchField[] {
  const fields = blueprint?.searchFields ?? blueprint?.fields ?? blueprint?.filters;
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field): Partial<SearchField> => {
      if (typeof field === 'string') return { field, displayName: field };
      const f = (field ?? {}) as Record<string, string | undefined>;
      const name = f.field ?? f.name ?? f.key ?? f.parameter;
      return { field: name, displayName: f.displayName ?? f.label ?? f.name ?? name, type: f.type };
    })
    .filter((f): f is SearchField => typeof f.field === 'string' && f.field !== '');
}

export function displayValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return String(o.displayName ?? o.name ?? o.url ?? JSON.stringify(value));
  }
  return String(value);
}

// Image path for a record value: a path string, an object with a url, or a list (first entry).
export function imagePath(value: unknown): string {
  if (Array.isArray(value)) return imagePath(value[0]);
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return String(o.url ?? o.src ?? o.path ?? '');
  }
  return '';
}

export const imagePaths = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value ? [value] : []).map(imagePath).filter(Boolean);

// ── Paging ──
// The data API pages its results through its url, e.g. "…/api/products?size=20&page=0". The size and
// the parameter names come from that url; pages are zero-based unless the url starts at page=1.

export interface Paging {
  pageParam: string;
  sizeParam: string;
  size: number;
  // Number the server uses for the first page (0 or 1).
  firstPage: number;
}

const PAGE_PARAMS = ['page', 'pageNo', 'pageNumber', 'pageIndex'];
const SIZE_PARAMS = ['size', 'pageSize', 'limit', 'perPage'];
export const DEFAULT_PAGE_SIZE = 20;

export function pagingOf(table: DataTableBlueprint, search: SearchBlueprint | null): Paging {
  return pagingOfUrl(search?.dataApi ?? search?.searchApi ?? table.dataApi ?? '');
}

export function pagingOfUrl(url: string): Paging {
  const params = new URLSearchParams(url.split('?')[1] ?? '');
  const pageParam = PAGE_PARAMS.find((p) => params.has(p)) ?? 'page';
  const sizeParam = SIZE_PARAMS.find((p) => params.has(p)) ?? 'size';
  const size = Number(params.get(sizeParam));
  const first = Number(params.get(pageParam));
  return {
    pageParam,
    sizeParam,
    size: Number.isInteger(size) && size > 0 ? size : DEFAULT_PAGE_SIZE,
    firstPage: first === 1 ? 1 : 0,
  };
}

// Query params for a page (index 0 = first page, whatever the server's numbering).
export const pageParams = (paging: Paging, index: number): Record<string, string> => ({
  [paging.pageParam]: String(paging.firstPage + index),
  [paging.sizeParam]: String(paging.size),
});

export interface PageInfo {
  // Total number of records, when the server says.
  total: number | null;
  // Number of pages, when it can be worked out.
  pageCount: number | null;
  hasNext: boolean;
}

const NESTED = ['pagination', 'paging', 'pageInfo', 'page', 'meta'];
const TOTAL_KEYS = ['totalRecords', 'totalElements', 'totalCount', 'totalItems', 'recordsTotal', 'total'];
const PAGES_KEYS = ['totalPages', 'pageCount', 'pages'];

function numberIn(response: unknown, keys: string[]): number | null {
  const r = response as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const scopes = [r, ...NESTED.map((k) => r[k]).filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object')];
  for (const scope of scopes) {
    for (const key of keys) {
      const n = Number(scope[key]);
      if (scope[key] != null && Number.isInteger(n) && n >= 0) return n;
    }
  }
  return null;
}

function flagIn(response: unknown, keys: string[]): boolean | null {
  const r = response as Record<string, unknown> | null;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  for (const key of keys) if (typeof r[key] === 'boolean') return r[key] as boolean;
  return null;
}

// What the server tells us about the page it returned. Without totals, a full page means there may be more.
export function pageInfo(response: unknown, rowCount: number, paging: Paging, index: number): PageInfo {
  const total = numberIn(response, TOTAL_KEYS);
  const pageCount = numberIn(response, PAGES_KEYS) ?? (total != null ? Math.ceil(total / paging.size) : null);
  const explicitNext = flagIn(response, ['hasNext', 'has_next', 'hasMore']);
  const last = flagIn(response, ['last', 'isLast']);
  const hasNext = explicitNext
    ?? (last != null ? !last : null)
    ?? (pageCount != null ? index + 1 < pageCount : rowCount >= paging.size);
  return { total, pageCount, hasNext };
}

// ── Columns ──
// Column flags: a column is hidden when any of these is false ("only show what is true").
// mobileDisplay is not here: it only decides what shows on small screens.
const COLUMN_FLAGS = ['visible', 'isVisible', 'display', 'show', 'showInGrid', 'showInTable', 'desktopDisplay', 'enabled'];
const columnEnabled = (c: GridColumn) => !COLUMN_FLAGS.some((flag) => c[flag] === false);
const isImageColumn = (c: GridColumn) => /image|photo|picture|thumbnail/i.test(c.field);
const isSubImageColumn = (c: GridColumn) => /sub|gallery|additional|extra|images$|photos$/i.test(c.field);
const isMrpColumn = (c: GridColumn) => /mrp/i.test(c.field); // MRP is never shown; only the final price is.
const isPriceColumn = (c: GridColumn) => /price|amount|cost/i.test(c.field);

// On a product grid only the essentials are shown: image, name, price and quantity.
const ESSENTIAL_PRODUCT_FIELD =
  /^(productname|name|title|finalprice|price|sellingprice|saleprice|stock|quantity|qty|availablequantity|stockquantity|availability)$/i;

export interface GridLayout {
  // A product catalogue (has a name and a price column): shown as product tiles.
  productGrid: boolean;
  columns: GridColumn[];
  // The one image shown: the "main" image if there is one, otherwise the first non-gallery image column.
  imageField: string | null;
  titleField: string | null;
}

export function gridLayout(blueprint: DataTableBlueprint): GridLayout {
  const all = (Array.isArray(blueprint.dataGrid) ? blueprint.dataGrid : []).filter(columnEnabled);
  const images = all.filter(isImageColumn);
  const imageField = (images.find((c) => /main|primary|cover/i.test(c.field)) ?? images.find((c) => !isSubImageColumn(c)))?.field ?? null;
  const productGrid = all.some((c) => /^(productname|name)$/i.test(c.field)) && all.some((c) => /price/i.test(c.field));
  const columns = all.filter((c) => {
    if (isImageColumn(c)) return c.field === imageField;
    if (isMrpColumn(c)) return false;
    return !productGrid || ESSENTIAL_PRODUCT_FIELD.test(c.field);
  });
  const titleField = columns.find((c) => ['productName', 'name', 'title'].includes(c.field))?.field ?? null;
  return { productGrid, columns, imageField, titleField };
}

const firstSet = (record: BlueprintRecord, keys: string[]): unknown =>
  keys.map((k) => record[k]).find((v) => v != null && String(v).trim() !== '' && String(v).toLowerCase() !== 'string');

export interface ProductMeta {
  // "500 g", "9 pc", "1L"; null when the record has no unit.
  unit: string | null;
  rating: number | null;
  ratingCount: number | null;
}

// Pack size and rating shown under a product tile's name. Read from the record itself, since these
// fields are usually not grid columns.
export function productMeta(record: BlueprintRecord): ProductMeta {
  const size = firstSet(record, ['unitSize', 'unit_size', 'packSize', 'size']);
  const type = firstSet(record, ['unitType', 'unit_type', 'unit', 'uom']);
  let unit: string | null = null;
  if (size != null) {
    const s = String(size).trim();
    // "500g" already carries its unit; "500" + "g" needs it appended.
    unit = type != null && /^\d+(\.\d+)?$/.test(s) ? `${s} ${String(type).trim()}` : s;
  } else if (type != null) {
    unit = String(type).trim();
  }
  const rating = Number(firstSet(record, ['rating', 'averageRating', 'avgRating']));
  const count = Number(firstSet(record, ['ratingCount', 'reviewCount', 'reviews', 'totalRatings']));
  return {
    unit,
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    ratingCount: Number.isFinite(count) && count > 0 ? count : null,
  };
}

export const isPriceField = (column: GridColumn): boolean => isPriceColumn(column);

export function formatCell(column: GridColumn, value: unknown): string {
  if (isPriceColumn(column) && value !== '' && value != null && !Number.isNaN(Number(value))) return price(Number(value));
  return displayValue(value);
}

// ── Display modes ──
export function defaultDisplayMode(b: DataTableBlueprint): DisplayMode {
  const available = (b.availableDisplayModes ?? []).map((m) => m.value);
  const preferred = b.defaultDisplayMode;
  if (preferred && available.includes(preferred) && (preferred === 'cards' || preferred === 'table')) return preferred;
  return available.includes('cards') || !available.includes('table') ? 'cards' : 'table';
}

// The table/cards switch only appears when the blueprint turns it on.
export const switchableModes = (b: DataTableBlueprint): { value: DisplayMode; label: string }[] =>
  b.enableMultipleDisplayModes === true
    ? (b.availableDisplayModes ?? []).filter((m): m is { value: DisplayMode; label: string } => m.value === 'cards' || m.value === 'table')
    : [];

// ── Actions ──
const enabledAction = (a: BlueprintAction | null | undefined): a is BlueprintAction => Boolean(a) && a!.enabled !== false && a!.visible !== false;

export const toolbarActions = (b: DataTableBlueprint): BlueprintAction[] =>
  b.enableActions === false ? [] : (b.actions ?? []).filter(enabledAction);

export const rowActions = (b: DataTableBlueprint): BlueprintAction[] =>
  (b.rowLevelactions ?? b.rowLevelActions ?? b.rowActions ?? []).filter(enabledAction);

export type ActionKind = 'create' | 'view' | 'edit' | 'delete';

// Blueprint icon names ("fa-add", "fa-eye", "fa-trash-alt") → what the action does.
const ACTION_KINDS: Record<string, ActionKind> = {
  add: 'create', plus: 'create', create: 'create', new: 'create',
  eye: 'view', view: 'view',
  edit: 'edit', pencil: 'edit', 'pen-to-square': 'edit', modify: 'edit',
  trash: 'delete', 'trash-alt': 'delete', 'trash-can': 'delete', delete: 'delete', remove: 'delete',
};
const iconKey = (name: unknown) => String(name ?? '').toLowerCase().trim().split(/\s+/).pop()!.replace(/^fa[srb]?-/, '');
export const actionKind = (...names: unknown[]): ActionKind | undefined => names.map((n) => ACTION_KINDS[iconKey(n)]).find(Boolean);

// Row actions put their icon in displayName ("fa-eye") and the label in iconToolTip ("Modify").
const looksLikeIcon = (text: unknown) => /^fa[srb]?[-\s]/i.test(String(text ?? ''));
export const actionLabel = (a: BlueprintAction): string =>
  a.iconToolTip ?? (looksLikeIcon(a.displayName) ? undefined : a.displayName) ?? a.action ?? '';
export const isDeleteAction = (a: BlueprintAction): boolean => /delete|remove/i.test(a.action ?? '');

// Form blueprints are served next to the screen's data-table blueprint, e.g.
// products/api/blueprint/productsDataTable → products/api/blueprint/productsEditForm. The name comes
// from the action's blueprintApi ("products/blueprint/{version}/productsEditForm").
export function formBlueprintUrl(actionUrl: string | undefined, dataTableUrl: string | null): string | null {
  const name = String(actionUrl ?? '').split(/[?#]/)[0].split('/').filter(Boolean).pop();
  const base = String(dataTableUrl ?? '').split(/[?#]/)[0].replace(/\/[^/]*$/, '');
  return name && /blueprint/i.test(base) ? `${base}/${name}` : null;
}

// The products api answers with snake_case image keys; the list uses camelCase.
export function normalizeRecord(record: unknown): BlueprintRecord {
  if (!record || typeof record !== 'object') return {};
  const { main_image: mainSnake, sub_images: subSnake, ...rest } = record as BlueprintRecord;
  return { ...rest, mainImage: rest.mainImage ?? mainSnake, subImages: rest.subImages ?? subSnake };
}
