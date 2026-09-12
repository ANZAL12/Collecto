"use client";

import * as React from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Receipt,
  RotateCcw,
  Building2,
  Layers,
  Calendar,
} from "lucide-react";
import {
  useExecutives,
  useExecutivePortalData,
  useTogglePaymentStatusMutation,
} from "@/lib/hooks/use-queries";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentSession, logout } from "@/lib/auth-service";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShopCollection, UserSession, CollectionItem } from "@/types";
import { LogOut } from "lucide-react";
import { getExecutiveCompanies } from "@/lib/executive-utils";
import { parseInvoiceMonth, getAvailableInvoiceMonths } from "@/lib/date-utils";
import { isDesktopApp } from "@/lib/desktop-utils";

export interface ShopCardData {
  name: string;
  companies: string[];
  invoices: ShopCollection[];
  pendingAmount: number;
  totalAmount: number;
  unpaidCount: number;
  paidCount: number;
  allPaid: boolean;
}

interface ExecutiveLandingViewProps {
  session?: UserSession | null;
  onLogout?: () => void;
}

export function ExecutiveLandingView({ session: propSession, onLogout }: ExecutiveLandingViewProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParamName = searchParams?.get("name");

  const [session, setSession] = React.useState<UserSession | null>(() => propSession || getCurrentSession());
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(!propSession);

  React.useEffect(() => {
    if (propSession) {
      setSession(propSession);
      setIsCheckingAuth(false);
      return;
    }
    const current = getCurrentSession();
    if (!current) {
      router.replace("/login");
    } else {
      setSession(current);
      setIsCheckingAuth(false);
    }
  }, [propSession, router]);

  const { data: executives = [] } = useExecutives();

  const isAdmin = session?.role === "admin";
  const [adminSelectedExec, setAdminSelectedExec] = React.useState<string>(() => urlParamName || "");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = React.useState<string>("all");

  React.useEffect(() => {
    if (urlParamName) {
      setAdminSelectedExec(urlParamName);
    }
  }, [urlParamName]);

  // Default admin preview to first available executive
  React.useEffect(() => {
    if (isAdmin && !adminSelectedExec && !urlParamName && executives.length > 0) {
      setAdminSelectedExec(executives[0].name);
    }
  }, [isAdmin, adminSelectedExec, urlParamName, executives]);

  // Active executive name (admin can switch preview, executive is locked to self)
  const activeExecutive = React.useMemo(() => {
    if (isAdmin) {
      return adminSelectedExec || executives[0]?.name || "";
    }
    return session?.name || "";
  }, [isAdmin, adminSelectedExec, executives, session]);

  // Secure isolated data fetch: fetches strictly this active executive's data from server API
  const { data: portalData, isLoading: isLoadingPortal } = useExecutivePortalData(activeExecutive);

  const togglePaymentMutation = useTogglePaymentStatusMutation(activeExecutive);

  // Search query
  const [searchQuery, setSearchQuery] = React.useState("");

  // Set of expanded shop names
  const [expandedShopNames, setExpandedShopNames] = React.useState<Set<string>>(new Set());

  // Collections for this executive (STRICT: isolated on server)
  const executiveCollections = React.useMemo(() => {
    return portalData?.collections || [];
  }, [portalData?.collections]);

  // Available invoice months for this executive's collections
  const availableMonths = React.useMemo(() => {
    return getAvailableInvoiceMonths(executiveCollections);
  }, [executiveCollections]);

  // Shops assigned to this executive (STRICT: isolated on server)
  const executiveShops = React.useMemo(() => {
    return portalData?.shops || [];
  }, [portalData?.shops]);

  // Handled companies for this executive
  const handledCompanies = React.useMemo(() => {
    if (portalData?.companies && portalData.companies.length > 0) {
      return portalData.companies;
    }
    const compSet = new Set<string>();
    for (const c of executiveCollections) {
      const comp = c.companyName?.trim() || c.brandName?.trim();
      if (comp) compSet.add(comp);
    }
    for (const s of executiveShops) {
      const comp = s.companyName?.trim() || s.brandName?.trim();
      if (comp) compSet.add(comp);
    }
    return Array.from(compSet).sort((a, b) => a.localeCompare(b));
  }, [portalData?.companies, executiveCollections, executiveShops]);

  // Reset filters when switching executive
  React.useEffect(() => {
    setSelectedCompanyFilter("all");
    setSelectedMonthFilter("all");
  }, [activeExecutive]);

  // Group collections under each shop
  const shops: ShopCardData[] = React.useMemo(() => {
    const shopMap = new Map<string, ShopCollection[]>();

    // 1. Add all shops
    for (const shop of executiveShops) {
      shopMap.set(shop.name.trim().toLowerCase(), []);
    }

    // 2. Add collections
    for (const col of executiveCollections) {
      const key = col.shopName.trim().toLowerCase();
      const existing = shopMap.get(key);
      if (existing) {
        existing.push(col);
      } else {
        shopMap.set(key, [col]);
      }
    }

    // Canonical names map and shop companies map
    const canonicalNameMap = new Map<string, string>();
    const shopCompaniesMap = new Map<string, Set<string>>();

    for (const s of executiveShops) {
      const key = s.name.trim().toLowerCase();
      canonicalNameMap.set(key, s.name);
      const comp = s.companyName?.trim() || s.brandName?.trim();
      if (comp) {
        if (!shopCompaniesMap.has(key)) shopCompaniesMap.set(key, new Set());
        shopCompaniesMap.get(key)!.add(comp);
      }
    }

    for (const c of executiveCollections) {
      const key = c.shopName.trim().toLowerCase();
      if (!canonicalNameMap.has(key)) {
        canonicalNameMap.set(key, c.shopName);
      }
      const comp = c.companyName?.trim() || c.brandName?.trim();
      if (comp) {
        if (!shopCompaniesMap.has(key)) shopCompaniesMap.set(key, new Set());
        shopCompaniesMap.get(key)!.add(comp);
      }
    }

    const list: ShopCardData[] = [];

    shopMap.forEach((rawInvoices, key) => {
      const displayName = canonicalNameMap.get(key) || key;
      const companies = Array.from(shopCompaniesMap.get(key) || []).sort();

      // 1. If a specific company is selected, filter invoices to that company
      let invoices =
        selectedCompanyFilter && selectedCompanyFilter !== "all"
          ? rawInvoices.filter((inv) => {
              const comp = inv.companyName?.trim() || inv.brandName?.trim();
              return comp?.toLowerCase() === selectedCompanyFilter.toLowerCase();
            })
          : rawInvoices;

      // 2. If a specific month is selected, filter invoices to that month
      if (selectedMonthFilter && selectedMonthFilter !== "all") {
        invoices = invoices.filter((inv) => {
          const m = parseInvoiceMonth(inv.invoiceDate);
          return m?.key === selectedMonthFilter;
        });
      }

      // Filter shop visibility:
      // If filtering by month, only include shops that have sales in that month
      if (selectedMonthFilter && selectedMonthFilter !== "all") {
        if (invoices.length === 0) {
          return;
        }
      } else if (selectedCompanyFilter && selectedCompanyFilter !== "all") {
        const matchesShopComp = companies.some(
          (c) => c.toLowerCase() === selectedCompanyFilter.toLowerCase()
        );
        const hasMatchingInvoices = invoices.length > 0;
        if (!matchesShopComp && !hasMatchingInvoices) {
          return;
        }
      }

      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const unpaidInvoices = invoices.filter((inv) => !inv.isPaid);
      const pendingAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const paidCount = invoices.filter((inv) => inv.isPaid).length;
      const unpaidCount = unpaidInvoices.length;
      const allPaid = invoices.length > 0 && unpaidCount === 0;

      list.push({
        name: displayName,
        companies,
        invoices,
        pendingAmount,
        totalAmount,
        unpaidCount,
        paidCount,
        allPaid,
      });
    });

    // Sort: pending dues / total sales first, then alphabetically
    return list.sort((a, b) => {
      if (a.pendingAmount > 0 && b.pendingAmount === 0) return -1;
      if (a.pendingAmount === 0 && b.pendingAmount > 0) return 1;
      if (a.totalAmount > 0 && b.totalAmount === 0) return -1;
      if (a.totalAmount === 0 && b.totalAmount > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [executiveShops, executiveCollections, selectedCompanyFilter, selectedMonthFilter]);

  // Overall metrics for current active filter
  const totalFilteredSales = React.useMemo(() => {
    return shops.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [shops]);

  const totalFilteredBills = React.useMemo(() => {
    return shops.reduce((acc, s) => acc + s.invoices.length, 0);
  }, [shops]);

  // Filtered by search
  const filteredShops = React.useMemo(() => {
    if (!searchQuery.trim()) return shops;
    const q = searchQuery.toLowerCase();
    return shops.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchCompany = s.companies.some((c) => c.toLowerCase().includes(q));
      const matchInvoice = s.invoices.some(
        (inv: ShopCollection) =>
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.companyName?.toLowerCase().includes(q) ||
          inv.brandName?.toLowerCase().includes(q) ||
          inv.invoiceDate?.toLowerCase().includes(q) ||
          inv.items?.some((it: CollectionItem) => it.productName.toLowerCase().includes(q))
      );
      return matchName || matchCompany || matchInvoice;
    });
  }, [shops, searchQuery]);

  // Toggle card expansion
  const toggleShop = (shopName: string) => {
    setExpandedShopNames((prev) => {
      const next = new Set(prev);
      if (next.has(shopName)) next.delete(shopName);
      else next.add(shopName);
      return next;
    });
  };

  // Reversible payment toggle (Paid <-> Unpaid)
  const handleTogglePayment = async (
    e: React.MouseEvent,
    invoiceId: string,
    currentStatus: boolean | undefined
  ) => {
    e.stopPropagation();
    await togglePaymentMutation.mutateAsync({
      invoiceId,
      isPaid: !currentStatus,
    });
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    if (onLogout) {
      onLogout();
    } else {
      router.replace("/login");
    }
  };

  const isLoading = isLoadingPortal;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-mono text-muted-foreground">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {/* Admin Executive Switcher (Only visible to Admin on Desktop App) */}
        {isAdmin && isDesktopApp() && (
          <div className="flex items-center justify-between bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">Previewing:</span>
              <select
                value={activeExecutive}
                onChange={(e) => setAdminSelectedExec(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground"
              >
                {executives.map((ex) => (
                  <option key={ex.id} value={ex.name}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
            <a
              href="/admin/dashboard"
              className="text-[11px] font-mono font-medium text-foreground hover:underline"
            >
              Admin Portal &rarr;
            </a>
          </div>
        )}

        {/* Executive Info & Handled Companies Bar */}
        {activeExecutive && (
          <div className="rounded-xl border border-border bg-card p-3 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {activeExecutive.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{activeExecutive}</span>
                    {handledCompanies.length > 1 && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Multi-Company ({handledCompanies.length})
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    Field Executive • {shops.length} {shops.length === 1 ? "Shop" : "Shops"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogoutClick}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-border bg-card shadow-2xs text-muted-foreground hover:text-foreground transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Handled Companies & Month Filter Section */}
            {(handledCompanies.length > 0 || availableMonths.length > 0) && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                  {handledCompanies.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-muted-foreground font-mono flex items-center gap-1 text-[11px] shrink-0">
                        <Building2 className="h-3 w-3 text-primary shrink-0" />
                        <span>{handledCompanies.length === 1 ? "Company:" : "Companies:"}</span>
                      </span>
                      {handledCompanies.length === 1 ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-muted/60 border border-border text-foreground">
                          {handledCompanies[0]}
                        </span>
                      ) : (
                        selectedCompanyFilter !== "all" && (
                          <button
                            type="button"
                            onClick={() => setSelectedCompanyFilter("all")}
                            className="text-primary font-mono hover:underline text-[10px] ml-1"
                          >
                            Show All
                          </button>
                        )
                      )}
                    </div>
                  ) : <div />}

                  {/* Month Filter Selector */}
                  {availableMonths.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 shadow-2xs ml-auto shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      <select
                        value={selectedMonthFilter}
                        onChange={(e) => setSelectedMonthFilter(e.target.value)}
                        className="text-[11px] font-mono bg-transparent border-0 font-medium text-foreground focus:outline-none cursor-pointer pr-1"
                        aria-label="Filter by month"
                      >
                        <option value="all">
                          All Months ({availableMonths.reduce((acc, m) => acc + (m.count || 0), 0)})
                        </option>
                        {availableMonths.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label} ({m.count} bills)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Company filter chips if multiple companies */}
                {handledCompanies.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedCompanyFilter("all")}
                      className={`h-6 px-2.5 rounded-md text-[11px] font-mono font-medium shrink-0 transition-all border ${
                        selectedCompanyFilter === "all"
                          ? "bg-foreground text-background border-foreground shadow-2xs"
                          : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      All Brands ({shops.length})
                    </button>
                    {handledCompanies.map((comp) => {
                      const isSelected = selectedCompanyFilter.toLowerCase() === comp.toLowerCase();
                      return (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => setSelectedCompanyFilter(isSelected ? "all" : comp)}
                          className={`h-6 px-2.5 rounded-md text-[11px] font-mono font-medium shrink-0 transition-all border flex items-center gap-1 ${
                            isSelected
                              ? "bg-foreground text-background border-foreground shadow-2xs"
                              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          <span>{comp}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search Option */}
        <div className="relative pt-0.5">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search shops, companies, bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm rounded-xl border border-border bg-card shadow-2xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Active Month Sales Summary Banner */}
        {selectedMonthFilter !== "all" && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-1.5 font-medium text-foreground min-w-0">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                {availableMonths.find((m) => m.key === selectedMonthFilter)?.label || selectedMonthFilter} Sales:
              </span>
              <span className="font-bold font-mono text-primary shrink-0">
                {formatCurrency(totalFilteredSales)}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                ({totalFilteredBills} {totalFilteredBills === 1 ? "bill" : "bills"})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMonthFilter("all")}
              className="text-[11px] font-mono text-primary hover:underline ml-2 shrink-0 font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {/* SHOPS AS CARDS */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-mono">
            Loading shops...
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? `No shops found matching "${searchQuery}"`
                : selectedMonthFilter !== "all"
                ? `No sales recorded in ${availableMonths.find((m) => m.key === selectedMonthFilter)?.label || selectedMonthFilter}.`
                : selectedCompanyFilter !== "all"
                ? `No shops found for company "${selectedCompanyFilter}".`
                : activeExecutive
                ? `No shops assigned to ${activeExecutive} yet. Contact admin to assign shops.`
                : "No shops assigned to your account."}
            </p>
            {(searchQuery || selectedCompanyFilter !== "all" || selectedMonthFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCompanyFilter("all");
                  setSelectedMonthFilter("all");
                }}
                className="h-7 text-xs font-mono"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredShops.map((shop) => {
              const isExpanded = expandedShopNames.has(shop.name);

              return (
                <div
                  key={shop.name}
                  className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden transition-all"
                >
                  {/* Shop Card (Click to expand details) */}
                  <button
                    type="button"
                    onClick={() => toggleShop(shop.name)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 cursor-pointer focus:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-sm font-semibold text-foreground leading-snug truncate">
                          {shop.name}
                        </h2>
                        {shop.companies && shop.companies.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {shop.companies.map((comp) => (
                              <span
                                key={comp}
                                className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-muted border border-border text-foreground"
                              >
                                {comp}
                              </span>
                            ))}
                            {shop.companies.length > 1 && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Multi-Brand
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-muted-foreground">
                        {shop.invoices.length === 0 ? (
                          <span>0 bills</span>
                        ) : shop.allPaid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            {shop.invoices.length} {shop.invoices.length === 1 ? "bill (Paid)" : "bills (Paid)"}
                          </span>
                        ) : (
                          <span>
                            {shop.invoices.length} {shop.invoices.length === 1 ? "bill" : "bills"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="text-sm font-bold font-mono text-foreground">
                        {formatCurrency(
                          shop.pendingAmount > 0 ? shop.pendingAmount : shop.totalAmount
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* DETAILS UNDER THE SHOP (Invoices, items, and reversible paid status) */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-3 space-y-2.5">
                      {shop.invoices.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2 italic">
                          No collection invoices for this shop.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {shop.invoices.map((inv: ShopCollection) => (
                            <div
                              key={inv.id}
                              className={`rounded-lg border p-2.5 text-xs transition-colors ${
                                inv.isPaid
                                  ? "border-border/60 bg-background/60 opacity-80"
                                  : "border-border bg-background shadow-2xs"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground flex-wrap">
                                    <Receipt className="h-3 w-3 text-muted-foreground" />
                                    <span>#{inv.invoiceNo}</span>
                                    {(inv.companyName || inv.brandName) && (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-muted border border-border text-foreground">
                                        {inv.companyName || inv.brandName}
                                      </span>
                                    )}
                                  </div>
                                  {inv.invoiceDate && (
                                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                      {inv.invoiceDate}
                                    </div>
                                  )}
                                </div>

                                <div className="text-right font-mono">
                                  <span className="font-bold text-foreground">
                                    {formatCurrency(inv.totalAmount)}
                                  </span>
                                </div>
                              </div>

                              {/* Items list if any */}
                              {inv.items && inv.items.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                  {inv.items.map((it: CollectionItem, idx: number) => (
                                    <div
                                      key={it.id || idx}
                                      className="flex items-center justify-between text-[11px] font-mono text-muted-foreground"
                                    >
                                      <span className="truncate mr-2 text-foreground">
                                        {it.productName}
                                      </span>
                                      <span className="shrink-0">
                                        x{it.quantity} • {formatCurrency(it.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reversible Mark Paid / Unpaid Button */}
                              <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono">
                                  {inv.isPaid ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Paid
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground font-medium">
                                      Unpaid
                                    </span>
                                  )}
                                </span>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={inv.isPaid ? "outline" : "default"}
                                  disabled={togglePaymentMutation.isPending}
                                  onClick={(e) => handleTogglePayment(e, inv.id, inv.isPaid)}
                                  className={`h-7 px-2.5 text-xs font-mono gap-1.5 ${
                                    inv.isPaid
                                      ? "text-muted-foreground hover:text-foreground"
                                      : "bg-foreground text-background font-medium"
                                  }`}
                                >
                                  {inv.isPaid ? (
                                    <>
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Mark Unpaid</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>Mark Paid</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Sign Out</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to log out?
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
              You will need your username and password to sign back in on this device.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-9 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmLogout}
                className="h-9 text-xs font-medium gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
