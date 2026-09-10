import { Shop, ShopMapping, ShopCollection, Executive } from "@/types";

/**
 * Extract unique companies/brands handled by a specific executive
 * from mapped shops, shop mappings, and collection records.
 */
export function getExecutiveCompanies(
  executiveName: string,
  options: {
    shops?: Shop[];
    mappings?: ShopMapping[];
    collections?: ShopCollection[];
    executiveId?: string;
  }
): string[] {
  if (!executiveName && !options.executiveId) return [];

  const targetName = (executiveName || "").trim().toLowerCase();
  const targetId = (options.executiveId || "").trim().toLowerCase();
  const companySet = new Set<string>();

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

  // 3. From collection records
  if (options.collections) {
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
    });
    map.set(key, companies);
  }

  return map;
}
