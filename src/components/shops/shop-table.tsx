"use client";

import * as React from "react";
import { Shop } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useExecutives, useCompanies } from "@/lib/hooks/use-queries";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  Trash2,
  Loader2,
  Search,
  X,
  RotateCcw,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ShopTableProps {
  shops: Shop[];
  onUpdateExecutive?: (shopId: string, shopName: string, executiveName: string) => void;
  onDeleteShop?: (shopId: string, shopName: string) => void;
  deletingShopId?: string | null;
  className?: string;
  statusFilter?: "ALL" | "MAPPED" | "UNMAPPED";
  onStatusFilterChange?: (status: "ALL" | "MAPPED" | "UNMAPPED") => void;
}

export function ShopTable({
  shops,
  onUpdateExecutive,
  onDeleteShop,
  deletingShopId,
  className,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
}: ShopTableProps) {
  const { data: executives = [] } = useExecutives();
  const { data: companies = [] } = useCompanies();

  // Internal filters state
  const [internalStatusFilter, setInternalStatusFilter] = React.useState<"ALL" | "MAPPED" | "UNMAPPED">("ALL");
  const [search, setSearch] = React.useState("");
  const [executiveFilter, setExecutiveFilter] = React.useState("ALL");
  const [companyFilter, setCompanyFilter] = React.useState("ALL");

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Synchronize controlled vs internal status filter
  const currentStatusFilter = controlledStatusFilter !== undefined ? controlledStatusFilter : internalStatusFilter;
  const setStatusFilter = (status: "ALL" | "MAPPED" | "UNMAPPED") => {
    if (onStatusFilterChange) {
      onStatusFilterChange(status);
    } else {
      setInternalStatusFilter(status);
    }
  };

  // Metrics across all registered shops
  const mappedTotal = React.useMemo(() => {
    return shops.filter((s) => Boolean(s.assignedExecutiveName)).length;
  }, [shops]);
  const unmappedTotal = shops.length - mappedTotal;

  // Executive counts mapping
  const executiveCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of shops) {
      if (s.assignedExecutiveName) {
        const k = s.assignedExecutiveName.toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    return counts;
  }, [shops]);

  // Company counts mapping
  const companyCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of shops) {
      const c = (s.companyName || s.brandName)?.trim();
      if (c) {
        const k = c.toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    return counts;
  }, [shops]);

  // Filtered shops based on search, status, executive, and company
  const filteredShops = React.useMemo(() => {
    return shops.filter((shop) => {
      // 1. Search filter across shop name, executive, and brand
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = shop.name.toLowerCase().includes(q);
        const matchExec = shop.assignedExecutiveName?.toLowerCase().includes(q);
        const matchComp = (shop.companyName || shop.brandName)?.toLowerCase().includes(q);
        if (!matchName && !matchExec && !matchComp) {
          return false;
        }
      }

      // 2. Status filter
      if (currentStatusFilter === "MAPPED" && !shop.assignedExecutiveName) {
        return false;
      }
      if (currentStatusFilter === "UNMAPPED" && Boolean(shop.assignedExecutiveName)) {
        return false;
      }

      // 3. Executive filter
      if (executiveFilter !== "ALL") {
        if (executiveFilter === "UNASSIGNED") {
          if (shop.assignedExecutiveName) return false;
        } else {
          if (shop.assignedExecutiveName?.toLowerCase() !== executiveFilter.toLowerCase()) {
            return false;
          }
        }
      }

      // 4. Company filter
      if (companyFilter !== "ALL") {
        const shopComp = (shop.companyName || shop.brandName)?.trim().toLowerCase();
        if (companyFilter === "UNASSIGNED") {
          if (shopComp) return false;
        } else {
          if (shopComp !== companyFilter.toLowerCase()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [shops, search, currentStatusFilter, executiveFilter, companyFilter]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, currentStatusFilter, executiveFilter, companyFilter]);

  // Slice shops for the active page
  const paginatedShops = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShops.slice(start, start + pageSize);
  }, [filteredShops, currentPage, pageSize]);

  const hasActiveFilters =
    search.trim() !== "" ||
    currentStatusFilter !== "ALL" ||
    executiveFilter !== "ALL" ||
    companyFilter !== "ALL";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setExecutiveFilter("ALL");
    setCompanyFilter("ALL");
  };

  return (
    <Card className={className}>
      <CardHeader className="py-3 px-4 border-b border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span>Registered Retail Shops</span>
              <span className="font-mono text-foreground font-bold text-sm">
                ({filteredShops.length}{filteredShops.length !== shops.length ? ` of ${shops.length}` : ""})
              </span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Assign an executive to auto-match incoming collections
            </p>
          </div>

          {/* Status Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                currentStatusFilter === "ALL"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({shops.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("MAPPED")}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all flex items-center gap-1 ${
                currentStatusFilter === "MAPPED"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-emerald-600"
              }`}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Mapped ({mappedTotal})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("UNMAPPED")}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all flex items-center gap-1 ${
                currentStatusFilter === "UNMAPPED"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-amber-600"
              }`}
            >
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span>Unmapped ({unmappedTotal})</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search shop name, executive, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-xs h-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Executive Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 h-8 shrink-0">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={executiveFilter}
              onChange={(e) => setExecutiveFilter(e.target.value)}
              className="text-xs font-mono bg-transparent border-0 text-foreground focus:outline-none cursor-pointer pr-1 min-w-[140px]"
              title="Filter by assigned executive"
              aria-label="Filter by assigned executive"
            >
              <option value="ALL">All Executives ({shops.length})</option>
              <option value="UNASSIGNED">-- Unassigned ({unmappedTotal}) --</option>
              {executives.map((exec) => (
                <option key={exec.id} value={exec.name}>
                  {exec.name} ({executiveCounts[exec.name.toLowerCase()] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Company / Brand Filter Dropdown (if companies exist or tagged) */}
          {(companies.length > 0 || Object.keys(companyCounts).length > 0) && (
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 h-8 shrink-0">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="text-xs font-mono bg-transparent border-0 text-foreground focus:outline-none cursor-pointer pr-1 min-w-[130px]"
                title="Filter by company / brand"
                aria-label="Filter by company / brand"
              >
                <option value="ALL">All Companies</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.name}>
                    {comp.name} ({companyCounts[comp.name.toLowerCase()] || 0})
                  </option>
                ))}
                {Object.keys(companyCounts)
                  .filter((cName) => !companies.some((comp) => comp.name.toLowerCase() === cName))
                  .map((cName) => (
                    <option key={cName} value={cName}>
                      {cName.toUpperCase()} ({companyCounts[cName]})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs font-mono gap-1 shrink-0 text-muted-foreground hover:text-foreground border-dashed"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/20">
                <TableHead className="w-12 text-center text-xs">#</TableHead>
                <TableHead className="text-xs">Shop Name</TableHead>
                <TableHead className="text-xs">Brand / Company</TableHead>
                <TableHead className="text-xs">Assigned Field Executive</TableHead>
                <TableHead className="text-xs text-right">Status</TableHead>
                {onDeleteShop && (
                  <TableHead className="text-xs text-right w-16">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={onDeleteShop ? 6 : 5}
                    className="h-24 text-center text-xs text-muted-foreground"
                  >
                    No shops registered yet. Click &quot;Add Shop&quot; or &quot;Import from Excel&quot; to create shops and assign executives.
                  </TableCell>
                </TableRow>
              ) : filteredShops.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={onDeleteShop ? 6 : 5}
                    className="h-28 text-center text-xs text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                      <p className="font-medium text-foreground">No shops matching your filter criteria</p>
                      <p className="text-[11px] text-muted-foreground">
                        {search ? `No results found for "${search}". ` : ""}
                        Try adjusting or clearing your search and filters.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-7 text-xs font-mono gap-1 mt-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Clear All Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedShops.map((shop, idx) => (
                  <TableRow key={`${shop.id}_${shop.companyId || shop.brandId || ""}_${idx}`}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-foreground">
                      {shop.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {shop.companyName || shop.brandName ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono uppercase bg-muted/80 text-foreground border border-border"
                        >
                          {shop.companyName || shop.brandName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {onUpdateExecutive ? (
                        <select
                          value={shop.assignedExecutiveName || ""}
                          onChange={(e) =>
                            onUpdateExecutive(shop.id, shop.name, e.target.value)
                          }
                          className="h-7 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900 min-w-[170px]"
                        >
                          <option value="">-- Unassigned --</option>
                          {executives.map((exec) => (
                            <option key={exec.id} value={exec.name}>
                              {exec.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-foreground">
                          {shop.assignedExecutiveName || (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={shop.assignedExecutiveName ? "default" : "outline"}
                        className={`text-[10px] uppercase font-mono ${
                          shop.assignedExecutiveName
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "text-muted-foreground border-dashed"
                        }`}
                      >
                        {shop.assignedExecutiveName ? "Mapped" : "Unmapped"}
                      </Badge>
                    </TableCell>
                    {onDeleteShop && (
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteShop(shop.id, shop.name)}
                          disabled={deletingShopId === shop.id}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50 cursor-pointer"
                          title={`Delete shop "${shop.name}"`}
                        >
                          {deletingShopId === shop.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {filteredShops.length > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalItems={filteredShops.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}
    </Card>
  );
}
