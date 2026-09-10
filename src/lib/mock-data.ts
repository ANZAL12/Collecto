import {
  Executive,
  Shop,
  ShopMapping,
  OutstandingDetail,
  UploadBatch,
  ParsedExcelRow,
  ShopCollection,
} from "@/types";

/**
 * Clean data structures (All mock data removed)
 * Data is dynamically loaded and persisted through Supabase
 */
export const mockExecutives: Executive[] = [];
export const mockShops: Shop[] = [];
export const mockShopMappings: ShopMapping[] = [];
export const mockOutstandingDetails: OutstandingDetail[] = [];
export const mockShopCollections: ShopCollection[] = [];
export const mockCollections: ShopCollection[] = [];
export const mockCollectionRecords: ShopCollection[] = [];
export const mockUploadBatches: UploadBatch[] = [];
export const mockUploadHistory: UploadBatch[] = [];
export const mockParsedExcelPreview: ParsedExcelRow[] = [];
