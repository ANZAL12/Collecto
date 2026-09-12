"use client";

import * as React from "react";
import { ShopCollection, ParsedExcelRow } from "@/types";
import { groupRowsByShop } from "@/lib/excel-parser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Package,
  Info,
  Search,
  User,
  Building2,
  X,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle,
  Check,
  CheckCircle2,
  CopyX,
} from "lucide-react";

interface UploadPreviewProps {
  collections?: ShopCollection[];
  rows?: ParsedExcelRow[];
  groupedShops?: ShopCollection[];
  className?: string;
  executives?: { id: string; name: string }[];
  onUpdateShopExecutive?: (shopId: string, newExecutiveName: string | undefined) => void;
  showWarningsOnly?: boolean;
  onToggleWarningsOnly?: (show: boolean) => void;
}

export function UploadPreview({
  collections: directCollections,
  rows,
  groupedShops,
  className,
  executives,
  onUpdateShopExecutive,
  showWarningsOnly: controlledWarningsOnly,
  onToggleWarningsOnly,
}: UploadPreviewProps) {
  // 1. Raw collections list
  const collections: ShopCollection[] = React.useMemo(() => {
    let list: ShopCollection[] = [];
    if (directCollections && directCollections.length > 0) list = directCollections;
    else if (groupedShops && groupedShops.length > 0) list = groupedShops;
    else if (rows && rows.length > 0) list = groupRowsByShop(rows);
    return list.filter(
      (c) =>
        c.shopName &&
        !c.shopName.toLowerCase().includes("cancel") &&
        !c.shopName.toLowerCase().includes("void") &&
        !c.shopName.toLowerCase().includes("delete")
    );
  }, [directCollections, groupedShops, rows]);

  // 2. Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedExecutive, setSelectedExecutive] = React.useState<string>("all");
  const [selectedCompany, setSelectedCompany] = React.useState<string>("all");
  const [isDuplicatesOnly, setIsDuplicatesOnly] = React.useState(false);

  // Warnings filter state (controlled or local) - filters to unmapped shops needing an executive
  const [internalWarningsOnly, setInternalWarningsOnly] = React.useState(false);
  const isWarningsOnly = controlledWarningsOnly !== undefined ? controlledWarningsOnly : internalWarningsOnly;

  // Track shop IDs in the warning review queue so they are NOT removed when solved
  const [warningQueueShopIds, setWarningQueueShopIds] = React.useState<Set<string>>(new Set());
  // Track order in which warnings were resolved so newly resolved items move to top
  const [resolvedOrder, setResolvedOrder] = React.useState<string[]>([]);

  // When warning mode is activated or collections change, keep the warning queue up to date
  React.useEffect(() => {
    if (isWarningsOnly) {
      setWarningQueueShopIds((prev) => {
        const next = new Set(prev);
        for (const shop of collections) {
          if (!shop.executiveName || shop.status === "unmapped") {
            next.add(shop.id);
          }
        }
        return next;
      });
    } else {
      setWarningQueueShopIds(new Set());
      setResolvedOrder([]);
    }
  }, [isWarningsOnly, collections]);

  // Update resolved order when items in the warning queue get mapped
  React.useEffect(() => {
    if (!isWarningsOnly) return;
    setResolvedOrder((prev) => {
      const resolvedNow = collections
        .filter((s) => warningQueueShopIds.has(s.id) && Boolean(s.executiveName) && s.status !== "unmapped")
        .map((s) => s.id);

      const existing = prev.filter((id) => resolvedNow.includes(id));
      const newlyResolved = resolvedNow.filter((id) => !existing.includes(id));
      const updated = [...newlyResolved, ...existing];
      if (updated.length !== prev.length || updated.some((id, i) => id !== prev[i])) {
        return updated;
      }
      return prev;
    });
  }, [collections, warningQueueShopIds, isWarningsOnly]);

  const handleToggleWarnings = (val: boolean) => {
    setInternalWarningsOnly(val);
    onToggleWarningsOnly?.(val);
    if (!val) {
      setWarningQueueShopIds(new Set());
      setResolvedOrder([]);
    }
  };

  // 3. Extract unique executive options with counts
  const executiveOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    let unmappedCount = 0;

    for (const c of collections) {
      const name = c.executiveName?.trim();
      if (name) {
        counts.set(name, (counts.get(name) || 0) + 1);
      } else {
        unmappedCount++;
      }
    }

    const list = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { list, unmappedCount };
  }, [collections]);

  // 4. Extract unique company options with counts
  const companyOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of collections) {
      const comp = c.companyName?.trim() || c.brandName?.trim();
      if (comp) {
        counts.set(comp, (counts.get(comp) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collections]);

  // 4b. Extract warning counts across collections (unmapped shops needing executive assignment)
  const warningCounts = React.useMemo(() => {
    let unmapped = 0;
    for (const shop of collections) {
      if (!shop.executiveName || shop.status === "unmapped") {
        unmapped++;
      }
    }
    return { unmapped, total: unmapped };
  }, [collections]);

  // 4c. Extract duplicate voucher counts across collections
  const duplicateCount = React.useMemo(() => {
    return collections.filter((shop) => shop.isDuplicateVoucher).length;
  }, [collections]);

  // Resolved warning items count
  const resolvedWarningsCount = React.useMemo(() => {
    return collections.filter(
      (s) => warningQueueShopIds.has(s.id) && Boolean(s.executiveName) && s.status !== "unmapped"
    ).length;
  }, [collections, warningQueueShopIds]);

  // Dismiss resolved warnings when admin clicks "Issue Resolved" button
  const handleDismissResolved = () => {
    setWarningQueueShopIds((prev) => {
      const next = new Set(prev);
      for (const shop of collections) {
        if (Boolean(shop.executiveName) && shop.status !== "unmapped") {
          next.delete(shop.id);
        }
      }
      return next;
    });
    setResolvedOrder([]);

    const remainingUnmapped = collections.filter((s) => !s.executiveName || s.status === "unmapped");
    if (remainingUnmapped.length === 0) {
      handleToggleWarnings(false);
    }
  };

  // 5. Apply filters & search
  const filteredCollections = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const execFilter = selectedExecutive.trim().toLowerCase();
    const compFilter = selectedCompany.trim().toLowerCase();

    const filtered = collections.filter((shop) => {
      // Filter by duplicate vouchers
      if (isDuplicatesOnly && !shop.isDuplicateVoucher) {
        return false;
      }

      // Filter by warnings: include unmapped shops OR shops currently in the warning review queue
      if (isWarningsOnly) {
        const isUnmapped = !shop.executiveName || shop.status === "unmapped";
        const isInWarningQueue = warningQueueShopIds.has(shop.id);
        if (!isUnmapped && !isInWarningQueue) return false;
      }

      // Filter by executive
      if (execFilter !== "all") {
        if (execFilter === "unmapped") {
          if (shop.executiveName) return false;
        } else {
          if (!shop.executiveName || shop.executiveName.trim().toLowerCase() !== execFilter) {
            return false;
          }
        }
      }

      // Filter by company / brand
      if (compFilter !== "all") {
        const cName = (shop.companyName || shop.brandName || "").trim().toLowerCase();
        if (cName !== compFilter) return false;
      }

      // Search query across shop name, invoice no, GSTIN, executive, brand, and item names
      if (q) {
        const matchShop = shop.shopName?.toLowerCase().includes(q);
        const matchInv = shop.invoiceNo?.toLowerCase().includes(q);
        const matchGst = shop.gstinUin?.toLowerCase().includes(q);
        const matchExec = shop.executiveName?.toLowerCase().includes(q);
        const matchComp = (shop.companyName || shop.brandName || "").toLowerCase().includes(q);
        const matchItems = shop.items?.some((it) => it.productName?.toLowerCase().includes(q));

        if (!matchShop && !matchInv && !matchGst && !matchExec && !matchComp && !matchItems) {
          return false;
        }
      }

      return true;
    });

    // When in warning review mode, move resolved warning shops to the TOP!
    if (isWarningsOnly) {
      return [...filtered].sort((a, b) => {
        const aResolved = warningQueueShopIds.has(a.id) && Boolean(a.executiveName) && a.status !== "unmapped";
        const bResolved = warningQueueShopIds.has(b.id) && Boolean(b.executiveName) && b.status !== "unmapped";

        if (aResolved && !bResolved) return -1; // Resolved moves to top
        if (!aResolved && bResolved) return 1;
        if (aResolved && bResolved) {
          const aIdx = resolvedOrder.indexOf(a.id);
          const bIdx = resolvedOrder.indexOf(b.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        }
        return 0;
      });
    }

    return filtered;
  }, [collections, searchQuery, selectedExecutive, selectedCompany, isWarningsOnly, warningQueueShopIds, resolvedOrder]);

  // 6. Pagination state (reset to page 1 whenever filters change)
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedExecutive, selectedCompany, isWarningsOnly]);

  const paginatedCollections = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCollections.slice(start, start + pageSize);
  }, [filteredCollections, currentPage, pageSize]);

  // 7. Track expanded state for accordion rows
  const [expandedShops, setExpandedShops] = React.useState<Set<string>>(() => {
    return new Set(collections.map((c) => c.id || `${c.shopName}_${c.invoiceNo}`));
  });

  // Keep expanded set updated when collections change
  React.useEffect(() => {
    setExpandedShops(new Set(collections.map((c) => c.id || `${c.shopName}_${c.invoiceNo}`)));
  }, [collections]);

  const toggleShop = (key: string) => {
    setExpandedShops((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const areAllExpanded =
    filteredCollections.length > 0 &&
    filteredCollections.every((c) => expandedShops.has(c.id || `${c.shopName}_${c.invoiceNo}`));

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedShops(new Set());
    } else {
      setExpandedShops(
        new Set(filteredCollections.map((c) => c.id || `${c.shopName}_${c.invoiceNo}`))
      );
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedExecutive("all");
    setSelectedCompany("all");
    setIsDuplicatesOnly(false);
    handleToggleWarnings(false);
    setCurrentPage(1);
  };

  const isFilterActive =
    searchQuery.trim() !== "" ||
    selectedExecutive !== "all" ||
    selectedCompany !== "all" ||
    isWarningsOnly ||
    isDuplicatesOnly;

  // Filtered metrics
  const filteredTotalAmount = React.useMemo(() => {
    return filteredCollections.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
  }, [filteredCollections]);

  const filteredTotalItems = React.useMemo(() => {
    return filteredCollections.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [filteredCollections]);


  return (
    <Card className={className}>
      {/* Header */}
      <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>Parsed Sales Preview</span>
            <span className="text-foreground font-bold">
              ({filteredCollections.length}{isFilterActive ? ` of ${collections.length}` : ""} Shops • {filteredTotalItems} Items • Total: {formatCurrency(filteredTotalAmount)})
            </span>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Shops are parent records with assigned executives. Expand each shop row to view its itemized products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleExpandAll}
            disabled={filteredCollections.length === 0}
            className="h-7 px-2.5 text-xs font-mono gap-1 cursor-pointer"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {areAllExpanded ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      </CardHeader>

      {/* Search & Executive / Brand Filter Bar */}
      <div className="px-4 py-2 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm relative">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
          <Input
            placeholder="Search shop, invoice no, GST, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-7 text-xs bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Executive Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2.5 py-1 shadow-2xs">
            <User className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground font-medium shrink-0">Executive:</span>
            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              className="text-xs bg-transparent border-0 font-medium text-foreground focus:outline-none cursor-pointer pr-1"
              aria-label="Filter by executive"
            >
              <option value="all">All Executives ({collections.length})</option>
              {executiveOptions.list.map((ex) => (
                <option key={ex.name} value={ex.name}>
                  {ex.name} ({ex.count} shops)
                </option>
              ))}
              {executiveOptions.unmappedCount > 0 && (
                <option value="unmapped">
                  Unmapped ({executiveOptions.unmappedCount} shops)
                </option>
              )}
            </select>
          </div>

          {/* Company / Brand Filter Dropdown (shown when multi-company exists) */}
          {companyOptions.length > 1 && (
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2.5 py-1 shadow-2xs">
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">Brand:</span>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="text-xs bg-transparent border-0 font-medium text-foreground focus:outline-none cursor-pointer pr-1"
                aria-label="Filter by brand"
              >
                <option value="all">All Brands ({collections.length})</option>
                {companyOptions.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count} shops)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Warnings Filter Toggle Button */}
          <Button
            type="button"
            variant={isWarningsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const nextVal = !isWarningsOnly;
              handleToggleWarnings(nextVal);
              if (nextVal) setIsDuplicatesOnly(false);
            }}
            disabled={warningCounts.total === 0 && resolvedWarningsCount === 0}
            className={cn(
              "h-8 px-2.5 text-xs font-mono gap-1.5 cursor-pointer transition-all shadow-2xs",
              isWarningsOnly
                ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 font-semibold ring-1 ring-amber-500/40"
                : warningCounts.total > 0
                ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                : "text-muted-foreground opacity-50 cursor-not-allowed"
            )}
            title={warningCounts.total > 0 ? "Filter table to show unmapped warning rows" : "No warnings (all shops mapped)"}
          >
            <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", isWarningsOnly ? "text-white" : "text-amber-500")} />
            <span>Warnings ({warningCounts.total})</span>
            {isWarningsOnly && <X className="h-3 w-3 ml-0.5" />}
          </Button>

          {/* Duplicates Filter Toggle Button */}
          {duplicateCount > 0 && (
            <Button
              type="button"
              variant={isDuplicatesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const nextVal = !isDuplicatesOnly;
                setIsDuplicatesOnly(nextVal);
                if (nextVal) handleToggleWarnings(false);
              }}
              className={cn(
                "h-8 px-2.5 text-xs font-mono gap-1.5 cursor-pointer transition-all shadow-2xs",
                isDuplicatesOnly
                  ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 font-semibold ring-1 ring-rose-500/40"
                  : "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
              )}
              title="Show duplicate voucher numbers that cannot be added again"
            >
              <CopyX className="h-3.5 w-3.5 shrink-0" />
              <span>Duplicates ({duplicateCount})</span>
              {isDuplicatesOnly && <X className="h-3 w-3 ml-0.5" />}
            </Button>
          )}

          {/* Issue Resolved Button in Filter Bar */}
          {resolvedWarningsCount > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleDismissResolved}
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-2xs cursor-pointer animate-in fade-in"
              title="Apply resolutions and remove solved warnings from this list"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Issue Resolved ({resolvedWarningsCount})</span>
            </Button>
          )}

          {/* Reset Filters Button */}
          {isFilterActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-mono gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Duplicates Filter Active Banner */}
      {isDuplicatesOnly && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900 dark:text-rose-300">
          <div className="flex items-center gap-2 font-medium">
            <CopyX className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              Showing <strong>{filteredCollections.length}</strong> duplicate {filteredCollections.length === 1 ? "voucher" : "vouchers"}. <em>Duplicates cannot be added again and will be skipped when saving.</em>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsDuplicatesOnly(false)}
            className="text-[11px] underline font-mono hover:text-rose-950 dark:hover:text-rose-100 cursor-pointer font-semibold"
          >
            Show All ({collections.length})
          </button>
        </div>
      )}

      {/* Duplicate Voucher Advisory Notice (when not in duplicates filter) */}
      {duplicateCount > 0 && !isDuplicatesOnly && !isWarningsOnly && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900 dark:text-rose-300">
          <div className="flex items-center gap-2 font-medium">
            <CopyX className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              <strong>Duplicate Notice:</strong> {duplicateCount} {duplicateCount === 1 ? "voucher already exists" : "vouchers already exist"} and cannot be added again. They will be skipped automatically on save.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsDuplicatesOnly(true);
              handleToggleWarnings(false);
            }}
            className="text-[11px] underline font-mono hover:text-rose-950 dark:hover:text-rose-100 cursor-pointer font-semibold"
          >
            Review Duplicates ({duplicateCount})
          </button>
        </div>
      )}

      {/* Warning Filter Active Banner */}
      {isWarningsOnly && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Warning Review Queue:{" "}
              <strong>{filteredCollections.length}</strong> {filteredCollections.length === 1 ? "shop" : "shops"} (
              {warningCounts.total > 0 ? (
                <><strong>{warningCounts.total}</strong> pending assignment</>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">all mapped!</span>
              )}
              {resolvedWarningsCount > 0 && (
                <span className="text-emerald-700 dark:text-emerald-300 ml-1 font-semibold">
                  • {resolvedWarningsCount} resolved (at top)
                </span>
              )}
              )
            </span>
          </div>
          <div className="flex items-center gap-2">
            {resolvedWarningsCount > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleDismissResolved}
                className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-2xs cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Issue Resolved ({resolvedWarningsCount})</span>
              </Button>
            )}
            <button
              type="button"
              onClick={() => handleToggleWarnings(false)}
              className="text-[11px] underline font-mono hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer font-semibold"
            >
              Show All ({collections.length})
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/20">
                <TableHead className="w-8 p-2 text-center"></TableHead>
                <TableHead className="w-10 text-center text-xs">#</TableHead>
                <TableHead className="text-xs">Shop Name (Parent)</TableHead>
                <TableHead className="text-xs">Invoice Number</TableHead>
                <TableHead className="text-xs">Invoice Date</TableHead>
                <TableHead className="text-xs">GST Details</TableHead>
                <TableHead className="text-xs text-center">Items</TableHead>
                <TableHead className="text-xs text-right">Total Amount</TableHead>
                <TableHead className="text-xs">Assigned Executive</TableHead>
                <TableHead className="text-xs text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCollections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-28 text-center text-xs text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <SlidersHorizontal className="h-5 w-5 text-muted-foreground/60" />
                      <span>No collections match the current filter or search criteria.</span>
                      {isFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-primary font-medium hover:underline text-xs cursor-pointer"
                        >
                          Clear filters & search
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCollections.map((shop, index) => {
                  const key = shop.id || `${shop.shopName}_${shop.invoiceNo}`;
                  const isExpanded = expandedShops.has(key);
                  const isUnmapped = !shop.executiveName || shop.status === "unmapped";
                  const isResolvedWarning = isWarningsOnly && warningQueueShopIds.has(shop.id) && !isUnmapped;
                  const hasWarning = isUnmapped; // ONLY unmapped shops are warnings

                  return (
                    <React.Fragment key={key}>
                      {/* Shop Row (Parent) */}
                      <TableRow
                        onClick={() => toggleShop(key)}
                        className={cn(
                          "cursor-pointer transition-colors border-b border-border hover:bg-muted/40",
                          isExpanded && "bg-muted/25",
                          hasWarning && "bg-amber-500/[0.04]",
                          isResolvedWarning && "bg-emerald-500/[0.06] border-l-2 border-l-emerald-500",
                          shop.isDuplicateVoucher && "bg-rose-500/[0.04] opacity-85"
                        )}
                      >
                        <TableCell className="p-2 text-center text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-foreground transition-transform" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            {shop.isDuplicateVoucher ? (
                              <span
                                title={shop.duplicateReason || "Duplicate voucher: cannot be added again"}
                                className="inline-flex items-center"
                              >
                                <CopyX className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              </span>
                            ) : isResolvedWarning ? (
                              <span
                                title="Issue resolved: Executive assigned. Click 'Issue Resolved' to apply and dismiss."
                                className="inline-flex items-center"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              </span>
                            ) : hasWarning ? (
                              <span
                                title="Warning: Unmapped executive. Please assign an executive."
                                className="inline-flex items-center"
                              >
                                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                              </span>
                            ) : null}
                            <span>{(currentPage - 1) * pageSize + index + 1}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground">{shop.shopName}</span>
                            {shop.isDuplicateVoucher && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-semibold inline-flex items-center gap-1"
                                title={shop.duplicateReason || "Duplicate voucher number - cannot be added again"}
                              >
                                <CopyX className="h-2.5 w-2.5" />
                                Duplicate (Skipped)
                              </Badge>
                            )}
                            {isResolvedWarning && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-semibold inline-flex items-center gap-1"
                              >
                                <Check className="h-2.5 w-2.5" />
                                Resolved
                              </Badge>
                            )}
                            {shop.companyName && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0 bg-primary/5 text-primary border-primary/20"
                              >
                                {shop.companyName}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                shop.isDuplicateVoucher
                                  ? "line-through text-rose-600 dark:text-rose-400 font-semibold"
                                  : "text-muted-foreground"
                              )}
                            >
                              {shop.invoiceNo}
                            </span>
                            {shop.isDuplicateVoucher && (
                              <span className="text-[9px] font-mono text-rose-500 font-medium">
                                cannot add again
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {shop.invoiceDate}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {shop.gstinUin || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono px-1.5 py-0 inline-flex items-center gap-1"
                          >
                            <Package className="h-2.5 w-2.5" />
                            {shop.items.length} {shop.items.length === 1 ? "item" : "items"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                          {formatCurrency(shop.totalAmount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {onUpdateShopExecutive && executives && executives.length > 0 ? (
                            <div className="relative inline-flex items-center">
                              <select
                                value={shop.executiveName || ""}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  onUpdateShopExecutive(shop.id, val ? val : undefined);
                                }}
                                className={cn(
                                  "h-6 text-[11px] font-medium rounded px-1.5 py-0 border transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary",
                                  shop.executiveName
                                    ? "bg-primary/10 border-primary/30 text-foreground font-semibold"
                                    : "bg-muted/60 border-border text-muted-foreground italic"
                                )}
                              >
                                <option value="" className="italic text-muted-foreground bg-background">
                                  Unmapped
                                </option>
                                {executives.map((ex) => (
                                  <option key={ex.id} value={ex.name} className="not-italic text-foreground bg-background">
                                    {ex.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : shop.executiveName ? (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-[11px]">
                              <User className="h-3 w-3 text-primary" />
                              <span>{shop.executiveName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground italic bg-muted/60 border border-border px-1.5 py-0.5 rounded text-[11px]">
                              Unmapped
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] uppercase font-mono",
                              shop.isDuplicateVoucher
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold"
                                : shop.isExistingShop
                                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                            )}
                          >
                            {shop.isDuplicateVoucher ? "Duplicate" : shop.isExistingShop ? "Registered" : "New Shop"}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Item Rows (Children) */}
                      {isExpanded && (
                        <TableRow className="border-b border-border/80 bg-muted/10 hover:bg-muted/10">
                          <TableCell colSpan={10} className="p-0">
                            <div className="py-2.5 pl-10 pr-4 bg-muted/10">
                              <div className="rounded border border-border bg-background overflow-hidden">
                                <div className="px-3 py-1.5 bg-muted/30 border-b border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                  <span>
                                    Itemized Products for <strong>{shop.shopName}</strong> ({shop.items.length} items)
                                  </span>
                                  <span>Invoice Total: <strong>{formatCurrency(shop.totalAmount)}</strong></span>
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-border bg-muted/5 text-[11px]">
                                      <TableHead className="w-8 text-center text-[11px]">#</TableHead>
                                      <TableHead className="text-[11px]">Product / Item Name</TableHead>
                                      <TableHead className="text-[11px] text-right">Quantity</TableHead>
                                      <TableHead className="text-[11px] text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {shop.items.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-2">
                                          No itemized products found for this shop invoice.
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      shop.items.map((item, idx) => (
                                        <TableRow key={item.id || idx} className="border-b border-border/40 hover:bg-muted/20">
                                          <TableCell className="text-center font-mono text-[10px] text-muted-foreground py-1.5">
                                            {idx + 1}
                                          </TableCell>
                                          <TableCell className="text-xs font-mono font-medium text-foreground py-1.5">
                                            {item.productName}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs text-foreground py-1.5">
                                            {item.quantity}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs font-semibold text-foreground py-1.5">
                                            {formatCurrency(item.amount)}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredCollections.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalItems={filteredCollections.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        )}
      </CardContent>
    </Card>
  );
}
