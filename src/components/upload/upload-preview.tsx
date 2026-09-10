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
import { formatCurrency } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ChevronDown, ChevronRight, ChevronsUpDown, Package } from "lucide-react";

interface UploadPreviewProps {
  collections?: ShopCollection[];
  rows?: ParsedExcelRow[];
  groupedShops?: ShopCollection[];
  className?: string;
}

export function UploadPreview({
  collections: directCollections,
  rows,
  groupedShops,
  className,
}: UploadPreviewProps) {
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

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const paginatedCollections = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return collections.slice(start, start + pageSize);
  }, [collections, currentPage, pageSize]);

  // Track expanded state for each parent shop row
  const [expandedShops, setExpandedShops] = React.useState<Set<string>>(() => {
    // Default: expand all so user immediately sees their items
    return new Set(collections.map((c) => c.id || `${c.shopName}_${c.invoiceNo}`));
  });

  // Keep expanded set updated when collections change
  React.useEffect(() => {
    setExpandedShops(new Set(collections.map((c) => c.id || `${c.shopName}_${c.invoiceNo}`)));
    setCurrentPage(1);
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

  const areAllExpanded = collections.length > 0 && expandedShops.size === collections.length;

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedShops(new Set());
    } else {
      setExpandedShops(new Set(collections.map((c) => c.id || `${c.shopName}_${c.invoiceNo}`)));
    }
  };

  const totalAmount = React.useMemo(() => {
    return collections.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);
  }, [collections]);

  const totalItems = React.useMemo(() => {
    return collections.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [collections]);

  return (
    <Card className={className}>
      <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Parsed Shop Collections ({collections.length} Shops • {totalItems} Items • Total: {formatCurrency(totalAmount)})
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Shops are parent records. Expand each shop row to view its child item list.
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
              {collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-xs text-muted-foreground">
                    No shop collections parsed.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCollections.map((shop, index) => {
                  const key = shop.id || `${shop.shopName}_${shop.invoiceNo}`;
                  const isExpanded = expandedShops.has(key);

                  return (
                    <React.Fragment key={key}>
                      {/* Shop Row (Parent) */}
                      <TableRow
                        onClick={() => toggleShop(key)}
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
                              Unmapped
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {shop.isExistingShop ? "Registered" : "New Shop"}
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
                                        <TableCell colSpan={4} className="text-center text-xs py-3 text-muted-foreground italic">
                                          No individual item rows parsed.
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      shop.items.map((item, itemIdx) => (
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

        {collections.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalItems={collections.length}
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
