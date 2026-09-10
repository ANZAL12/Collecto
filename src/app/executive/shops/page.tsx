"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShops } from "@/lib/hooks/use-queries";
import { getCurrentUser } from "@/lib/mock-auth";
import { PaginationBar } from "@/components/ui/pagination-bar";

export default function ExecutiveShopsPage() {
  const { data: allShops = [], isLoading } = useShops();
  const currentUser = getCurrentUser();
  const currentExecName = currentUser.name || "Rajesh Kumar";

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const shops = React.useMemo(() => {
    return allShops.filter(
      (shop) => shop.assignedExecutiveName?.toLowerCase() === currentExecName.toLowerCase()
    );
  }, [allShops, currentExecName]);

  const paginatedShops = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shops.slice(start, start + pageSize);
  }, [shops, currentPage, pageSize]);

  return (
    <ErpContainer
      title="Assigned Shops"
      badge="Executive"
      description={`Retail shops mapped to ${currentExecName}`}
    >
      <Card className="border-border">
        <CardHeader className="py-2.5 px-4 border-b border-border">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shops List ({shops.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/20">
                  <TableHead className="w-12 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs">Shop Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-16 text-center text-xs text-muted-foreground">
                      Loading assigned shops...
                    </TableCell>
                  </TableRow>
                ) : shops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-16 text-center text-xs text-muted-foreground">
                      No shops mapped to you yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedShops.map((shop, idx) => (
                    <TableRow key={shop.id || `${shop.name}_${idx}`}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {shop.name}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {shops.length > 0 && (
            <PaginationBar
              currentPage={currentPage}
              totalItems={shops.length}
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
    </ErpContainer>
  );
}
