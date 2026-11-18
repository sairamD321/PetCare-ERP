export interface StoreSettings {
  storeName: string;
  currency: string;
  lowStockThreshold: number;
}

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
