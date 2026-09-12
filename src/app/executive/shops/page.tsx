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
import { useShops, useShopCollections, useShopMappings } from "@/lib/hooks/use-queries";
import { getCurrentUser } from "@/lib/mock-auth";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Building2 } from "lucide-react";
import { getExecutiveCompanies } from "@/lib/executive-utils";

export default function ExecutiveShopsPage() {
  const { data: allShops = [], isLoading } = useShops();
  const { data: allCollections = [] } = useShopCollections();
  const { data: allMappings = [] } = useShopMappings();
  const currentUser = getCurrentUser();
  const currentExecName = currentUser.name || "Rajesh Kumar";

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState<string>("all");

  const handledCompanies = React.useMemo(() => {
    return getExecutiveCompanies(currentExecName, {
      shops: allShops,
      mappings: allMappings,
      collections: allCollections,
    });
  }, [currentExecName, allShops, allMappings, allCollections]);

  const shops = React.useMemo(() => {
    return allShops.filter((shop) => {
      const matchExec = shop.assignedExecutiveName?.toLowerCase() === currentExecName.toLowerCase();
      if (!matchExec) return false;
      if (selectedCompanyFilter !== "all") {
        const comp = shop.companyName || shop.brandName || "";
        return comp.toLowerCase() === selectedCompanyFilter.toLowerCase();
      }
      return true;
    });
  }, [allShops, currentExecName, selectedCompanyFilter]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyFilter]);

  const paginatedShops = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return shops.slice(start, start + pageSize);
  }, [shops, currentPage, pageSize]);

  return (
    <ErpContainer
      title="Assigned Shops"
      badge="Executive"
      description={`Retail shops mapped to ${currentExecName}`}
      actions={
        handledCompanies.length > 0 ? (
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
        ) : undefined
      }
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
                  <TableHead className="text-xs">Company / Brand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-xs text-muted-foreground">
                      Loading assigned shops...
                    </TableCell>
                  </TableRow>
                ) : shops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-xs text-muted-foreground">
                      No shops mapped to you yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedShops.map((shop, idx) => (
                    <TableRow key={`${shop.id || shop.name}_${shop.companyId || shop.brandId || ""}_${idx}`}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {shop.name}
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
