import { LucideIcon } from "lucide-react";

export type UserRole = "admin" | "executive";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employeeCode?: string;
  phone?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  description?: string;
}

/**
 * Field Executive (Name only)
 */
export interface Executive {
  id: string;
  name: string;
}

/**
 * Shop (Shop name only)
 */
export interface Shop {
  id: string;
  name: string;
  assignedExecutiveName?: string;
}

/**
 * Shop to Executive Mapping
 */
export interface ShopMapping {
  id: string;
  shopId: string;
  shopName: string;
  executiveId?: string;
  executiveName?: string;
  status: "mapped" | "unmapped";
}

/**
 * Child item/product belonging to a parent Shop Collection
 */
export interface CollectionItem {
  id?: string;
  productName: string;
  quantity: string | number;
  amount: number;
}

/**
 * Parent Shop Collection Record (1 Shop = 1 Parent Invoice with multiple child items)
 */
export interface ShopCollection {
  id: string;
  shopName: string;
  invoiceNo: string;
  invoiceDate: string;
  gstinUin?: string;
  totalAmount: number;
  totalQuantity?: string | number;
  executiveName?: string;
  status: "mapped" | "unmapped";
  isExistingShop?: boolean;
  uploadBatch?: string;
  items: CollectionItem[];
}

export type CollectionRecord = ShopCollection;

/**
 * Legacy aliases for backwards compatibility
 */
export interface OutstandingDetail {
  id: string;
  date?: string;
  shopName: string;
  itemName?: string;
  voucherNo: string;
  gstinUin: string;
  quantity: string | number;
  value: number;
  executiveName?: string;
  uploadBatch?: string;
  createdAt?: string;
}

/**
 * Upload Batch summary in history
 */
export interface UploadBatch {
  id: string;
  fileName: string;
  totalRows: number;
  uploadedAt: string;
  uploadDate?: string;
  status?: string;
}

export type UploadHistoryItem = UploadBatch;

/**
 * Parsed Excel Row structure
 */
export interface ParsedExcelRow {
  rowNumber: number;
  date: string;
  shopName: string;
  itemName?: string;
  voucherType: string;
  voucherNo: string;
  gstinUin: string;
  quantity: string | number;
  value: number;
  executiveName?: string;
  status: "mapped" | "unmapped";
}

export type GroupedShopItem = CollectionItem;
export type GroupedShopVoucher = ShopCollection;

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export interface PageContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
