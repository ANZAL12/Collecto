import { Shop, ShopMapping, ShopCollection, Executive } from "@/types";

const EXEC_COMPANIES_STORAGE_KEY = "collecto_executive_assigned_companies";

/**
 * Get the local map of directly assigned companies per executive
 */
export function getStoredExecutiveCompaniesMap(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EXEC_COMPANIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save directly assigned companies for an executive
 */
export function saveExecutiveCompanies(executiveName: string, companies: string[]): void {
  if (typeof window === "undefined" || !executiveName) return;
  try {
    const map = getStoredExecutiveCompaniesMap();
    const key = executiveName.trim().toLowerCase();
    map[key] = Array.from(new Set(companies.map((c) => c.trim()).filter(Boolean)));
    localStorage.setItem(EXEC_COMPANIES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Remove assigned companies cache when executive is deleted
 */
export function removeStoredExecutiveCompanies(executiveName: string): void {
  if (typeof window === "undefined" || !executiveName) return;
  try {
    const map = getStoredExecutiveCompaniesMap();
    const key = executiveName.trim().toLowerCase();
    delete map[key];
    localStorage.setItem(EXEC_COMPANIES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Extract unique companies/brands handled by a specific executive
 * from direct assignments, mapped shops, shop mappings, and collection records.
 */
export function getExecutiveCompanies(
  executiveName: string,
  options: {
    shops?: Shop[];
    mappings?: ShopMapping[];
    collections?: ShopCollection[];
    executiveId?: string;
    directCompanies?: string[];
  }
): string[] {
  if (!executiveName && !options.executiveId) return [];

  const targetName = (executiveName || "").trim().toLowerCase();
  const targetId = (options.executiveId || "").trim().toLowerCase();
  const companySet = new Set<string>();

  // 0. From directly assigned companies
  if (options.directCompanies && options.directCompanies.length > 0) {
    for (const comp of options.directCompanies) {
      if (comp && comp.trim()) companySet.add(comp.trim());
    }
  }

  // Also check stored assignments cache
  const storedMap = getStoredExecutiveCompaniesMap();
  const storedAssigned = storedMap[targetName] || [];
  for (const comp of storedAssigned) {
    if (comp && comp.trim()) companySet.add(comp.trim());
  }

  // 1. From assigned shops
  if (options.shops) {
    for (const shop of options.shops) {
      const matchName = shop.assignedExecutiveName?.trim().toLowerCase() === targetName;
      if (matchName) {
        const comp = shop.companyName?.trim() || shop.brandName?.trim();
        if (comp) companySet.add(comp);
      }
    }
  }

  // 2. From shop mappings
  if (options.mappings) {
    for (const m of options.mappings) {
      const matchName = m.executiveName?.trim().toLowerCase() === targetName;
      const matchId = targetId && m.executiveId?.trim().toLowerCase() === targetId;
      if (matchName || matchId) {
        const comp = m.companyName?.trim() || m.brandName?.trim();
        if (comp) companySet.add(comp);
      }
    }
  }

  // 3. Fallback from collection records only if no direct assignments or mapped shops exist
  if (companySet.size === 0 && options.collections) {
    for (const col of options.collections) {
      const matchName = col.executiveName?.trim().toLowerCase() === targetName;
      if (matchName) {
        const comp = col.companyName?.trim() || col.brandName?.trim();
        if (comp) companySet.add(comp);
      }
    }
  }

  return Array.from(companySet).sort((a, b) => a.localeCompare(b));
}

/**
 * Precompute a lookup map of [executiveNameLower -> string[]] of companies handled
 */
export function buildExecutiveCompaniesMap(
  executives: Executive[],
  options: {
    shops?: Shop[];
    mappings?: ShopMapping[];
    collections?: ShopCollection[];
  }
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const exec of executives) {
    const key = exec.name.trim().toLowerCase();
    const companies = getExecutiveCompanies(exec.name, {
      ...options,
      executiveId: exec.id,
      directCompanies: exec.companies,
    });
    map.set(key, companies);
  }

  return map;
}
