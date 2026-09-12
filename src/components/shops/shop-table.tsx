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
import { useExecutives } from "@/lib/hooks/use-queries";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Trash2, Loader2 } from "lucide-react";

interface ShopTableProps {
  shops: Shop[];
  onUpdateExecutive?: (shopId: string, shopName: string, executiveName: string) => void;
  onDeleteShop?: (shopId: string, shopName: string) => void;
  deletingShopId?: string | null;
  className?: string;
}

export function ShopTable({
  shops,
  onUpdateExecutive,
  onDeleteShop,
  deletingShopId,
  className,
}: ShopTableProps) {
  const { data: executives = [] } = useExecutives();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Slice shops for the active page
  const paginatedShops = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shops.slice(start, start + pageSize);
  }, [shops, currentPage, pageSize]);
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 border-b border-border">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Registered Retail Shops ({shops.length})
        </CardTitle>
        <span className="text-[11px] text-muted-foreground">
          Assign an executive to auto-match incoming collections
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/20">
                <TableHead className="w-12 text-center text-xs">#</TableHead>
                <TableHead className="text-xs">Shop Name</TableHead>
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
                    colSpan={onDeleteShop ? 5 : 4}
                    className="h-20 text-center text-xs text-muted-foreground"
                  >
                    No shops registered yet. Click &quot;Add Shop&quot; to create shops and assign executives.
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
                        variant="outline"
                        className="text-[10px] uppercase font-mono"
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
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
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

      {shops.length > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalItems={shops.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      )}
    </Card>
  );
}
