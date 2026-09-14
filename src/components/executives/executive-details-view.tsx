"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Store,
  Receipt,
  Package,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Copy,
  Check,
  RefreshCw,
  Phone,
  Building2,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  useExecutives,
  useShops,
  useShopCollections,
  useShopMappings,
} from "@/lib/hooks/use-queries";
import { getCurrentUser } from "@/lib/mock-auth";
import { formatCurrency, calculateRatePerUnit } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CollectionItem, ShopCollection } from "@/types";
import { getExecutiveCompanies } from "@/lib/executive-utils";

export function ExecutiveDetailsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParamName = searchParams.get("name");

  const currentUser = getCurrentUser();
  const { data: executives = [], isLoading: isLoadingExecs, refetch: refetchExecs } = useExecutives();
  const { data: allShops = [], isLoading: isLoadingShops, refetch: refetchShops } = useShops();
  const { data: allCollections = [], isLoading: isLoadingColls, refetch: refetchColls, isFetching } = useShopCollections();
  const { data: allMappings = [] } = useShopMappings();

  // Determine active executive name
  const [selectedExecutiveName, setSelectedExecutiveName] = React.useState<string>(() => {
    if (urlParamName) return urlParamName;
    if (currentUser?.role === "executive" && currentUser.name) return currentUser.name;
    return "Rajesh Kumar";
  });
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState<string>("all");

  // Sync state if URL search param changes
  React.useEffect(() => {
    if (urlParamName) {
      setSelectedExecutiveName(urlParamName);
    }
  }, [urlParamName]);

  // Set default when executives query resolves and no urlParamName
  React.useEffect(() => {
    if (!urlParamName && executives.length > 0) {
      const match = executives.find(
        (e) => e.name.toLowerCase() === selectedExecutiveName.toLowerCase()
      );
      if (!match) {
        // If current user is in executives, use it; otherwise first executive
        const userMatch = executives.find(
          (e) => e.name.toLowerCase() === currentUser.name?.toLowerCase()
        );
        if (userMatch) {
          setSelectedExecutiveName(userMatch.name);
        } else {
          setSelectedExecutiveName(executives[0].name);
        }
      }
    }
  }, [executives, urlParamName]);

  // Handler for executive switch
  const handleSelectExecutive = (name: string) => {
    setSelectedExecutiveName(name);
    setSelectedShopFilter(null);
    setSelectedCompanyFilter("all");
    setSearchQuery("");
    // update URL query param
    router.replace(`/executive/details?name=${encodeURIComponent(name)}`, { scroll: false });
  };

  // Handled companies for this executive
  const handledCompanies = React.useMemo(() => {
    if (!selectedExecutiveName) return [];
    return getExecutiveCompanies(selectedExecutiveName, {
      shops: allShops,
      mappings: allMappings,
      collections: allCollections,
    });
  }, [selectedExecutiveName, allShops, allMappings, allCollections]);

  // UI state: active tab
  const [activeTab, setActiveTab] = React.useState<"collections" | "shops" | "info">("collections");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedShopFilter, setSelectedShopFilter] = React.useState<string | null>(null);

  // Expanded cards set for invoice accordion
  const [expandedInvoiceIds, setExpandedInvoiceIds] = React.useState<Set<string>>(new Set());

  // Copy to clipboard notification
  const [copied, setCopied] = React.useState(false);

  // Filter collections for this executive strictly by handled companies
  const executiveCollections = React.useMemo(() => {
    const raw = allCollections.filter(
      (c) => c.executiveName?.toLowerCase() === selectedExecutiveName.toLowerCase()
    );
    if (handledCompanies.length === 0) return raw;
    const handledLower = new Set(handledCompanies.map((c) => c.toLowerCase()));
    return raw.filter((c) => {
      const comp = (c.companyName || c.brandName || "").trim().toLowerCase();
      return handledLower.has(comp);
    });
  }, [allCollections, selectedExecutiveName, handledCompanies]);

  // Filter shops assigned to this executive strictly by handled companies
  const executiveShops = React.useMemo(() => {
    const raw = allShops.filter(
      (s) => s.assignedExecutiveName?.toLowerCase() === selectedExecutiveName.toLowerCase()
    );
    if (handledCompanies.length === 0) return raw;
    const handledLower = new Set(handledCompanies.map((c) => c.toLowerCase()));
    return raw.filter((s) => {
      const comp = (s.companyName || s.brandName || "").trim().toLowerCase();
      return handledLower.has(comp);
    });
  }, [allShops, selectedExecutiveName, handledCompanies]);

  // Metrics calculation
  const totalPendingAmount = React.useMemo(() => {
    return executiveCollections.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  }, [executiveCollections]);

  const totalItemsCount = React.useMemo(() => {
    return executiveCollections.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [executiveCollections]);

  // Filtered collections for search, company filter & shop filter
  const filteredCollections = React.useMemo(() => {
    return executiveCollections.filter((c) => {
      if (selectedShopFilter && c.shopName.toLowerCase() !== selectedShopFilter.toLowerCase()) {
        return false;
      }
      if (selectedCompanyFilter !== "all") {
        const comp = c.companyName || c.brandName || "";
        if (comp.toLowerCase() !== selectedCompanyFilter.toLowerCase()) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.shopName.toLowerCase().includes(q) ||
        c.invoiceNo.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.brandName && c.brandName.toLowerCase().includes(q)) ||
        (c.gstinUin && c.gstinUin.toLowerCase().includes(q)) ||
        c.items?.some((item: CollectionItem) => item.productName.toLowerCase().includes(q))
      );
    });
  }, [executiveCollections, searchQuery, selectedShopFilter, selectedCompanyFilter]);

  // Filtered shops for search & company filter
  const filteredShops = React.useMemo(() => {
    return executiveShops.filter((s) => {
      if (selectedCompanyFilter !== "all") {
        const comp = s.companyName || s.brandName || "";
        if (comp.toLowerCase() !== selectedCompanyFilter.toLowerCase()) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.companyName && s.companyName.toLowerCase().includes(q));
    });
  }, [executiveShops, searchQuery, selectedCompanyFilter]);

  // Map each shop to its pending invoice count and total pending amount
  const shopStatsMap = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const c of executiveCollections) {
      const key = c.shopName.toLowerCase();
      const current = map.get(key) || { count: 0, total: 0 };
      current.count += 1;
      current.total += c.totalAmount || 0;
      map.set(key, current);
    }
    return map;
  }, [executiveCollections]);

  // Toggle single card
  const toggleInvoice = (id: string) => {
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand / collapse all
  const toggleAllInvoices = () => {
    if (expandedInvoiceIds.size === filteredCollections.length) {
      setExpandedInvoiceIds(new Set());
    } else {
      setExpandedInvoiceIds(new Set(filteredCollections.map((c) => c.id)));
    }
  };

  // Copy clean summary report for mobile sharing (WhatsApp, Notes, etc.)
  const handleCopySummary = () => {
    const text = [
      `*COLLECTO FIELD REPORT*`,
      `Executive: ${selectedExecutiveName}`,
      `Pending Collections: ${formatCurrency(totalPendingAmount)}`,
      `Invoices: ${executiveCollections.length} | Shops: ${executiveShops.length}`,
      `Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
      ``,
      ...filteredCollections.slice(0, 15).map(
        (c) => `• ${c.shopName}: ${formatCurrency(c.totalAmount)} (${c.invoiceNo})`
      ),
      filteredCollections.length > 15
        ? `...and ${filteredCollections.length - 15} more invoices.`
        : "",
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    refetchColls();
    refetchShops();
    refetchExecs();
  };

  const isLoading = isLoadingExecs || isLoadingShops || isLoadingColls;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <div className="max-w-2xl mx-auto px-3 sm:px-6 pt-3 space-y-3.5">
        {/* Top Minimal Navigation Bar */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Collecto
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-[11px] font-medium text-foreground">
              Executive Details
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Refresh data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 text-xs font-mono px-2.5 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-foreground" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="hidden xs:inline">Share</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Executive Profile Card */}
        <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar Icon */}
              <div className="h-11 w-11 shrink-0 rounded-full border border-border bg-secondary flex items-center justify-center font-mono font-semibold text-sm text-foreground">
                {selectedExecutiveName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-foreground truncate tracking-tight">
                    {selectedExecutiveName}
                  </h1>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-mono font-medium bg-secondary text-secondary-foreground">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Field Collection Agent • {currentUser?.employeeCode || "EX-ID"}
                </p>
              </div>
            </div>

            {/* Executive Switcher for multi-agent / admin testing */}
            {executives.length > 1 && (
              <div className="shrink-0">
                <select
                  value={selectedExecutiveName}
                  onChange={(e) => handleSelectExecutive(e.target.value)}
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label="Select executive"
                >
                  {executives.map((exec) => (
                    <option key={exec.id} value={exec.name}>
                      {exec.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Contact & Metadata */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 pt-2 border-t border-border text-[11px] font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {currentUser?.name === selectedExecutiveName && currentUser.phone
                ? currentUser.phone
                : "+91 98451 23456"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Store className="h-3 w-3" />
              {executiveShops.length} Assigned Shops
            </span>
            <span className="inline-flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              {executiveCollections.length} Pending Invoices
            </span>
          </div>

          {/* Handled Companies & Filter */}
          {handledCompanies.length > 0 && (
            <div className="pt-2 border-t border-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-mono flex items-center gap-1 text-[11px]">
                  <Building2 className="h-3 w-3 text-primary" />
                  <span>{handledCompanies.length === 1 ? "Company:" : "Companies Handled:"}</span>
                  {handledCompanies.length === 1 ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-muted/60 border border-border text-foreground">
                      {handledCompanies[0]}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Multi-Company ({handledCompanies.length})
                    </span>
                  )}
                </span>
                {handledCompanies.length > 1 && selectedCompanyFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyFilter("all")}
                    className="text-primary font-mono hover:underline text-[10px]"
                  >
                    Reset Brand Filter
                  </button>
                )}
              </div>

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
                    All Brands ({executiveShops.length})
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

        {/* Minimal Metric Tiles - 2x2 on Mobile, 4-col on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Total Pending Amount */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Total Pending
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5 tracking-tight truncate">
              {formatCurrency(totalPendingAmount)}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Outstanding collection
            </span>
          </div>

          {/* Assigned Shops */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Assigned Shops
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {executiveShops.length}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Mapped retailers
            </span>
          </div>

          {/* Pending Invoices */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Invoices
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {executiveCollections.length}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Active bills
            </span>
          </div>

          {/* Items count */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-muted-foreground block">
              Total Items
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {totalItemsCount}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Billed units
            </span>
          </div>
        </div>

        {/* Segmented Mobile Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all ${
              activeTab === "collections"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Receipt className="h-3.5 w-3.5 shrink-0" />
            <span>Invoices</span>
            <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-secondary text-foreground">
              {executiveCollections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shops")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all ${
              activeTab === "shops"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span>Shops</span>
            <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-secondary text-foreground">
              {executiveShops.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-md transition-all ${
              activeTab === "info"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>Profile</span>
          </button>
        </div>

        {/* Search Bar & Active Filter Bar (shown on collections & shops tabs) */}
        {activeTab !== "info" && (
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                placeholder={
                  activeTab === "collections"
                    ? "Search shop, invoice no, product..."
                    : "Search assigned shop name..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-9 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Shop Filter Chip */}
            {selectedShopFilter && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-secondary/80 border border-border text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-[11px]">Filtered shop:</span>
                  <span className="font-semibold text-foreground truncate text-xs">
                    {selectedShopFilter}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedShopFilter(null)}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-0.5 ml-2 shrink-0"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: COLLECTIONS / INVOICES (Mobile Card List) */}
        {activeTab === "collections" && (
          <div className="space-y-2.5">
            {/* Header bar with expand all toggle */}
            <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
              <span>
                Showing {filteredCollections.length} of {executiveCollections.length} invoices
              </span>
              {filteredCollections.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllInvoices}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  {expandedInvoiceIds.size === filteredCollections.length
                    ? "Collapse all"
                    : "Expand all items"}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-muted-foreground" />
                Loading collection details...
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center space-y-2">
                <Receipt className="h-6 w-6 text-muted-foreground mx-auto" />
                <div className="text-xs font-medium text-foreground">
                  {searchQuery || selectedShopFilter
                    ? "No invoices match the search or filter."
                    : `No pending collections assigned to ${selectedExecutiveName}.`}
                </div>
                {(searchQuery || selectedShopFilter) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedShopFilter(null);
                    }}
                    className="h-7 text-xs font-mono"
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCollections.map((col) => {
                  const isExpanded = expandedInvoiceIds.has(col.id);

                  return (
                    <div
                      key={col.id}
                      className="rounded-xl border border-border bg-card transition-all overflow-hidden shadow-2xs hover:border-border/80"
                    >
                      {/* Card Header: Clickable to expand */}
                      <button
                        type="button"
                        onClick={() => toggleInvoice(col.id)}
                        className="w-full text-left p-3 sm:p-3.5 flex flex-col gap-1.5 cursor-pointer focus:outline-none"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h2 className="text-xs sm:text-sm font-bold text-foreground leading-snug break-words">
                              {col.shopName}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-muted-foreground mt-0.5">
                              <span>#{col.invoiceNo}</span>
                              {col.companyName && (
                                <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-semibold text-[10px]">
                                  {col.companyName}
                                </span>
                              )}
                              {col.invoiceDate && <span>• {col.invoiceDate}</span>}
                              {col.gstinUin && <span>• {col.gstinUin}</span>}
                            </div>
                          </div>

                          {/* Right Amount & Expand Chevron */}
                          <div className="text-right shrink-0 flex items-center gap-2">
                            <div>
                              <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
                                {formatCurrency(col.totalAmount)}
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono px-1.5 py-0 mt-0.5"
                              >
                                {col.items?.length || 0}{" "}
                                {col.items?.length === 1 ? "item" : "items"}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Itemized Breakdown (Accordion Content) */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/20 px-3 py-2.5 sm:px-4 sm:py-3 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-muted-foreground tracking-wider pb-1 border-b border-border/50">
                            <span>Item Breakdown</span>
                            <span>Qty • Amount</span>
                          </div>

                          {col.items && col.items.length > 0 ? (
                            <div className="divide-y divide-border/40">
                              {col.items.map((item: CollectionItem, idx: number) => {
                                const rate = calculateRatePerUnit(item.amount, item.quantity);
                                const cleanQty = String(item.quantity || "1").replace(/^[xX\s]+/, "");
                                return (
                                  <div
                                    key={item.id || `${item.productName}_${idx}`}
                                    className="py-1.5 flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="font-mono text-xs text-foreground truncate block">
                                        {item.productName}
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0 font-mono text-xs text-foreground flex items-center gap-1.5">
                                      <span className="text-muted-foreground">
                                        x{cleanQty}
                                      </span>
                                      {rate !== null && (
                                        <span className="text-muted-foreground/80 text-[11px]">
                                          (@ {formatCurrency(rate)}/unit)
                                        </span>
                                      )}
                                      <span className="text-muted-foreground">•</span>
                                      <span className="font-semibold">
                                        {formatCurrency(item.amount)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-1">
                              No item details recorded.
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-border font-mono text-xs">
                            <span className="font-semibold text-foreground">
                              Invoice Total
                            </span>
                            <span className="font-bold text-foreground">
                              {formatCurrency(col.totalAmount)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ASSIGNED SHOPS LIST */}
        {activeTab === "shops" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
              <span>
                {filteredShops.length} Retailers assigned to {selectedExecutiveName}
              </span>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-muted-foreground" />
                Loading shops...
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center space-y-2">
                <Store className="h-6 w-6 text-muted-foreground mx-auto" />
                <div className="text-xs font-medium text-foreground">
                  {searchQuery
                    ? "No shops match your search."
                    : `No shops assigned to ${selectedExecutiveName}.`}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredShops.map((shop, idx) => {
                  const stats = shopStatsMap.get(shop.name.toLowerCase()) || {
                    count: 0,
                    total: 0,
                  };

                  return (
                    <div
                      key={`${shop.id || shop.name}_${shop.companyId || shop.brandId || ""}_${idx}`}
                      className="rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3 hover:border-border/80 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg border border-border bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                          <Store className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-semibold text-foreground break-words">
                            {shop.name}
                          </h3>
                          <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>
                              {stats.count}{" "}
                              {stats.count === 1 ? "invoice" : "invoices"}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(stats.total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Action: Filter invoices by this shop */}
                      {stats.count > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShopFilter(shop.name);
                            setActiveTab("collections");
                          }}
                          className="h-8 text-xs font-mono shrink-0 gap-1 px-2.5"
                        >
                          <span>View</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          No pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EXECUTIVE PROFILE & METADATA */}
        {activeTab === "info" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                Executive Profile Details
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-semibold text-foreground">{selectedExecutiveName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Designation</span>
                  <span className="font-mono text-foreground">Field Operations Executive</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Employee ID</span>
                  <span className="font-mono text-foreground">
                    {currentUser?.name === selectedExecutiveName && currentUser.employeeCode
                      ? currentUser.employeeCode
                      : "EX-101"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Contact Phone</span>
                  <span className="font-mono text-foreground">
                    {currentUser?.name === selectedExecutiveName && currentUser.phone
                      ? currentUser.phone
                      : "+91 98451 23456"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Assigned Shops</span>
                  <span className="font-mono font-semibold text-foreground">
                    {executiveShops.length} shops
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total Pending Dues</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatCurrency(totalPendingAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1">
                Quick Actions
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySummary}
                  className="w-full h-9 text-xs font-mono justify-center gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copied ? "Report Copied!" : "Copy WhatsApp Report"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedShopFilter(null);
                    setSearchQuery("");
                    setActiveTab("collections");
                  }}
                  className="w-full h-9 text-xs font-mono justify-center gap-2"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>View All Invoices</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
