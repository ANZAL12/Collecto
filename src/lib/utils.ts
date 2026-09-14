import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges multiple class names with Tailwind CSS conflict resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian Rupees (INR) or USD.
 */
export function formatCurrency(amount: number, currency: "INR" | "USD" = "INR"): string {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format standard date string (e.g. "09 Sep 2026").
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Extract numerical quantity from strings like "3 Nos", "x2 NO", "10 PCS", "1", etc.
 */
export function parseQuantityNumber(quantity?: string | number | null): number | null {
  if (quantity === undefined || quantity === null) return null;
  if (typeof quantity === "number") return quantity > 0 ? quantity : null;
  const clean = String(quantity).replace(/^[xX\s]+/, "").trim();
  const match = clean.match(/^(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return num > 0 ? num : null;
  }
  return null;
}

/**
 * Calculate rate per unit from total item amount and quantity.
 */
export function calculateRatePerUnit(amount: number, quantity?: string | number | null): number | null {
  const qty = parseQuantityNumber(quantity);
  if (!qty || qty <= 0 || !amount || amount <= 0) return null;
  return amount / qty;
}

