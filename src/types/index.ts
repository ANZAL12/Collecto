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
  username?: string;
  password?: string;
  companies?: string[];
}

/**
 * Shop (Shop name only)
 */
export interface Shop {
  id: string;
  name: string;
  assignedExecutiveName?: string;
  companyId?: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
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
  companyId?: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
  status: "mapped" | "unmapped";
}

/**
 * Company / Brand (e.g. Haier, General, Godrej, Global Agencies)
 */
export interface Company {
  id: string;
  name: string;
  code?: string;
  created_at?: string;
}

/**
 * Child item/product belonging to a parent Shop Collection
 */
export interface CollectionItem {
  id?: string;
  shopCollectionId?: string;
  productName: string;
  quantity: string | number;
  amount: number;
  companyId?: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
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
  companyId?: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
  status: "mapped" | "unmapped";
  isExistingShop?: boolean;
  isNotUnique?: boolean;
  uniquenessMessage?: string;
  uploadBatch?: string;
  isPaid?: boolean;
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
  companyId?: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
  uploadBatch?: string;
  createdAt?: string;
}

/**
 * Upload Batch summary in history
 */
export interface UploadBatch {
  id: string;
  fileName: string;
  companyId?: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
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
  companyId?: string;
  companyName?: string;
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
