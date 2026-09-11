"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShopCollections, useShops, useShopMappings } from "@/lib/hooks/use-queries";
import { ShopCollection, CollectionItem } from "@/types";
import { getCurrentUser } from "@/lib/mock-auth";
import { formatCurrency } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Search, ChevronDown, ChevronRight, ChevronsUpDown, Package, RefreshCw, Building2, Calendar } from "lucide-react";
import { getExecutiveCompanies } from "@/lib/executive-utils";
import { parseInvoiceMonth, getAvailableInvoiceMonths } from "@/lib/date-utils";

export default function ExecutiveCollectionsPage() {
  const { data: allCollections = [], isLoading, isFetching, refetch } = useShopCollections();
  const { data: allShops = [] } = useShops();
  const { data: allMappings = [] } = useShopMappings();

  const [search, setSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState<string>("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = React.useState<string>("all");

  const currentUser = getCurrentUser();
  const currentExecName = currentUser.name || "Rajesh Kumar";

  const handledCompanies = React.useMemo(() => {
    return getExecutiveCompanies(currentExecName, {
      shops: allShops,
      mappings: allMappings,
      collections: allCollections,
    });
  }, [currentExecName, allShops, allMappings, allCollections]);

  // Executive assigned collections
  const rawExecCollections = React.useMemo(() => {
    return allCollections.filter(
      (shop) => shop.executiveName?.toLowerCase() === currentExecName.toLowerCase()
    );
  }, [allCollections, currentExecName]);

  // Available invoice months
  const availableMonths = React.useMemo(() => {
    return getAvailableInvoiceMonths(rawExecCollections);
  }, [rawExecCollections]);

  const collections = React.useMemo(() => {
    return rawExecCollections.filter((shop) => {
      if (selectedCompanyFilter !== "all") {
        const comp = shop.companyName || shop.brandName || "";
        if (comp.toLowerCase() !== selectedCompanyFilter.toLowerCase()) return false;
      }
      if (selectedMonthFilter !== "all") {
        const parsed = parseInvoiceMonth(shop.invoiceDate);
        if (!parsed || parsed.key !== selectedMonthFilter) return false;
      }
      return true;
    });
  }, [rawExecCollections, selectedCompanyFilter, selectedMonthFilter]);

  const filteredShops = React.useMemo(() => {
    if (!search.trim()) return collections;
    const q = search.toLowerCase();
    return collections.filter(
      (shop) =>
        shop.shopName.toLowerCase().includes(q) ||
        shop.invoiceNo.toLowerCase().includes(q) ||
        (shop.companyName && shop.companyName.toLowerCase().includes(q)) ||
        (shop.brandName && shop.brandName.toLowerCase().includes(q)) ||
        (shop.gstinUin && shop.gstinUin.toLowerCase().includes(q)) ||
        (shop.invoiceDate && shop.invoiceDate.toLowerCase().includes(q)) ||
        shop.items.some((item: CollectionItem) => item.productName.toLowerCase().includes(q))
    );
  }, [collections, search]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCompanyFilter, selectedMonthFilter]);

  const paginatedShops = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShops.slice(start, start + pageSize);
  }, [filteredShops, currentPage, pageSize]);

  // Track expanded state for each parent shop row
  const [expandedShops, setExpandedShops] = React.useState<Set<string>>(new Set());

  const toggleShop = (id: string) => {
    setExpandedShops((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const areAllExpanded = filteredShops.length > 0 && expandedShops.size === filteredShops.length;

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedShops(new Set());
    } else {
      setExpandedShops(new Set(filteredShops.map((s) => s.id)));
    }
  };

  const totalAmount = filteredShops.reduce((acc, c) => acc + c.totalAmount, 0);
  const totalItemsCount = filteredShops.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <ErpContainer
      title="My Collections"
      badge="Executive"
      description={`Shop invoices and products assigned to ${currentExecName}`}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {handledCompanies.length > 0 && (
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-0.5 shadow-2xs">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="h-7 text-xs bg-transparent border-0 font-medium text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Companies ({handledCompanies.length})</option>
                {handledCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-0.5 shadow-2xs">
              <Calendar className="h-3 w-3 text-primary" />
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="h-7 text-xs bg-transparent border-0 font-medium text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Months ({availableMonths.length})</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.count})
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs font-mono gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
        </div>
        <Input
          type="text"
          placeholder="Search by shop name, product item, invoice no, or GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs h-8"
        />
      </div>

      <Card className="border-border">
        <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned Shops ({filteredShops.length} Shops • {totalItemsCount} Products • Total: {formatCurrency(totalAmount)})
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Click any shop row to expand its product list.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleExpandAll}
            className="h-7 px-2.5 text-xs font-mono gap-1"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {areAllExpanded ? "Collapse All" : "Expand All"}
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/20">
                  <TableHead className="w-8 p-2 text-center"></TableHead>
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs">Shop Name (Parent)</TableHead>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Invoice No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">GST Details</TableHead>
                  <TableHead className="text-xs text-center">Items</TableHead>
                  <TableHead className="text-xs text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                      Loading assigned collections...
                    </TableCell>
                  </TableRow>
                ) : filteredShops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                      No collections assigned to your account yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedShops.map((shop, index) => {
                    const isExpanded = expandedShops.has(shop.id);

                    return (
                      <React.Fragment key={shop.id}>
                        {/* Shop Row (Parent) */}
                        <TableRow
                          onClick={() => toggleShop(shop.id)}
                          className={`cursor-pointer transition-colors border-b border-border hover:bg-muted/40 ${
                            isExpanded ? "bg-muted/25" : ""
                          }`}
                        >
                          <TableCell className="p-2 text-center text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-foreground transition-transform" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {(currentPage - 1) * pageSize + index + 1}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {shop.shopName}
                          </TableCell>
                          <TableCell className="text-xs">
                            {shop.companyName || shop.brandName ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted border border-border text-foreground">
                                {shop.companyName || shop.brandName}
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {shop.invoiceNo}
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
                        </TableRow>

                        {/* Item Rows (Children) */}
                        {isExpanded && (
                          <TableRow className="border-b border-border/80 bg-muted/10 hover:bg-muted/10">
                            <TableCell colSpan={8} className="p-0">
                              <div className="py-2.5 pl-10 pr-4 bg-muted/10">
                                <div className="rounded border border-border bg-background overflow-hidden">
                                  <div className="px-3 py-1.5 bg-muted/30 border-b border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                    <span>
                                      Child Items for <strong>{shop.shopName}</strong> ({shop.items.length} items)
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
                                          <TableCell colSpan={4} className="text-center text-xs py-3 text-muted-foreground italic">
                                            No itemized products under this invoice.
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        shop.items.map((item: CollectionItem, itemIdx: number) => (
                                          <TableRow
                                            key={item.id || item.productName + itemIdx}
                                            className="hover:bg-muted/15 border-b border-border/40 last:border-0"
                                          >
                                            <TableCell className="text-center font-mono text-[11px] text-muted-foreground py-1.5">
                                              {itemIdx + 1}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-foreground py-1.5">
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

          <PaginationBar
            currentPage={currentPage}
            totalItems={filteredShops.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </CardContent>
      </Card>
    </ErpContainer>
  );
}
