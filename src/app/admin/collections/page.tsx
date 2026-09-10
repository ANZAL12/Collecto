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
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShopCollections, useExecutives } from "@/lib/hooks/use-queries";
import { ShopCollection, CollectionItem, Executive } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Search, ChevronDown, ChevronRight, ChevronsUpDown, Package, RefreshCw } from "lucide-react";

export default function AdminCollectionsPage() {
  const {
    data: collections = [],
    isLoading,
    isFetching: isFetchingColls,
    refetch: refetchColls,
  } = useShopCollections();
  const {
    data: executives = [],
    isFetching: isFetchingExecs,
    refetch: refetchExecs,
  } = useExecutives();

  const isFetching = isFetchingColls || isFetchingExecs;
  const [search, setSearch] = React.useState("");
  const [selectedExec, setSelectedExec] = React.useState("ALL");

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const handleRefresh = async () => {
    await Promise.all([refetchColls(), refetchExecs()]);
  };

  const filteredShops = React.useMemo(() => {
    return collections.filter((shop) => {
      const q = search.toLowerCase();
      const matchesSearch =
        shop.shopName.toLowerCase().includes(q) ||
        shop.invoiceNo.toLowerCase().includes(q) ||
        (shop.gstinUin && shop.gstinUin.toLowerCase().includes(q)) ||
        shop.items.some((item: CollectionItem) => item.productName.toLowerCase().includes(q));

      const matchesExec =
        selectedExec === "ALL" || shop.executiveName === selectedExec;

      return matchesSearch && matchesExec;
    });
  }, [collections, search, selectedExec]);

  // Reset to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedExec]);

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
      title="Outstanding Collections"
      badge="Admin"
      description="Parent shop records with nested child product items assigned to executives."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
          className="h-8 text-xs font-mono gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
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

        <select
          value={selectedExec}
          onChange={(e) => setSelectedExec(e.target.value)}
          className="h-8 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900 w-full sm:w-auto"
        >
          <option value="ALL">All Executives</option>
          {executives.map((exec) => (
            <option key={exec.id} value={exec.name}>
              {exec.name}
            </option>
          ))}
        </select>
      </div>

      {/* Expandable Collections Card */}
      <Card className="border-border">
        <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Shop Invoices ({filteredShops.length} Shops • {totalItemsCount} Products • Total: {formatCurrency(totalAmount)})
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
                  <TableHead className="text-xs">Invoice No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">GST Details</TableHead>
                  <TableHead className="text-xs text-center">Items</TableHead>
                  <TableHead className="text-xs text-right">Total Amount</TableHead>
                  <TableHead className="text-xs">Assigned Executive</TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-xs text-muted-foreground">
                      Loading collections from database...
                    </TableCell>
                  </TableRow>
                ) : filteredShops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center text-xs text-muted-foreground">
                      No collections found. Upload an Excel spreadsheet in Upload Center to process collections.
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
                          <TableCell className="text-xs">
                            {shop.executiveName ? (
                              <span className="text-foreground font-medium">
                                {shop.executiveName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {shop.status}
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
