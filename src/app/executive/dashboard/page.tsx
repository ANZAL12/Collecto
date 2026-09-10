"use client";

import * as React from "react";
import { Search, Building2 } from "lucide-react";
import { ErpContainer } from "@/components/layout/erp-container";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useShopCollections, useShops, useShopMappings } from "@/lib/hooks/use-queries";
import { getCurrentUser } from "@/lib/mock-auth";
import { formatCurrency } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { getExecutiveCompanies } from "@/lib/executive-utils";

export default function ExecutiveDashboardPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState<string>("all");
  const { data: allColls = [], isLoading: isLoadingColls } = useShopCollections();
  const { data: allShops = [], isLoading: isLoadingShops } = useShops();
  const { data: allMappings = [] } = useShopMappings();
  const isLoading = isLoadingColls || isLoadingShops;

  const currentUser = getCurrentUser();
  const currentExecName = currentUser.name || "Rajesh Kumar";

  // Invoices pagination state
  const [colPage, setColPage] = React.useState(1);
  const [colPageSize, setColPageSize] = React.useState(5);

  // Shops pagination state
  const [shopPage, setShopPage] = React.useState(1);
  const [shopPageSize, setShopPageSize] = React.useState(5);

  const handledCompanies = React.useMemo(() => {
    return getExecutiveCompanies(currentExecName, {
      shops: allShops,
      mappings: allMappings,
      collections: allColls,
    });
  }, [currentExecName, allShops, allMappings, allColls]);

  const collections = React.useMemo(() => {
    return allColls.filter((c) => {
      const matchExec = c.executiveName?.toLowerCase() === currentExecName.toLowerCase();
      if (!matchExec) return false;
      if (selectedCompanyFilter !== "all") {
        const comp = c.companyName || c.brandName || "";
        return comp.toLowerCase() === selectedCompanyFilter.toLowerCase();
      }
      return true;
    });
  }, [allColls, currentExecName, selectedCompanyFilter]);

  const shops = React.useMemo(() => {
    return allShops.filter((s) => {
      const matchExec = s.assignedExecutiveName?.toLowerCase() === currentExecName.toLowerCase();
      if (!matchExec) return false;
      if (selectedCompanyFilter !== "all") {
        const comp = s.companyName || s.brandName || "";
        return comp.toLowerCase() === selectedCompanyFilter.toLowerCase();
      }
      return true;
    });
  }, [allShops, currentExecName, selectedCompanyFilter]);

  const filteredCollections = React.useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const q = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.shopName.toLowerCase().includes(q) ||
        c.invoiceNo.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.brandName && c.brandName.toLowerCase().includes(q)) ||
        (c.gstinUin && c.gstinUin.toLowerCase().includes(q))
    );
  }, [collections, searchQuery]);

  React.useEffect(() => {
    setColPage(1);
  }, [searchQuery, selectedCompanyFilter]);

  const paginatedCollections = React.useMemo(() => {
    const start = (colPage - 1) * colPageSize;
    return filteredCollections.slice(start, start + colPageSize);
  }, [filteredCollections, colPage, colPageSize]);

  const paginatedShops = React.useMemo(() => {
    const start = (shopPage - 1) * shopPageSize;
    return shops.slice(start, start + shopPageSize);
  }, [shops, shopPage, shopPageSize]);

  const totalValue = filteredCollections.reduce((acc, c) => acc + c.totalAmount, 0);

  return (
    <ErpContainer
      title="Field Workspace"
      badge="Executive"
      description={`Collections for ${currentExecName}`}
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
      {/* Companies Handled Banner if multiple companies */}
      {handledCompanies.length > 1 && (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-500/5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground flex items-center gap-1 font-mono">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Handles {handledCompanies.length} Companies:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {handledCompanies.map((comp) => (
                <span
                  key={comp}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-background border border-border text-foreground shadow-2xs"
                >
                  {comp}
                </span>
              ))}
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold shrink-0">
            Multi-Company
          </span>
        </div>
      )}
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
        </div>
        <Input
          type="text"
          placeholder="Search collections by shop name, invoice no, or GSTIN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs h-8"
        />
      </div>

      {/* Outstanding Collections Table */}
      <Card className="border-border">
        <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My Assigned Invoices ({filteredCollections.length} invoices • Total: {formatCurrency(totalValue)})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/20">
                  <TableHead className="text-xs">Shop Name</TableHead>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Invoice No</TableHead>
                  <TableHead className="text-xs">GSTIN/UIN</TableHead>
                  <TableHead className="text-xs text-center">Items</TableHead>
                  <TableHead className="text-xs text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                      Loading your collections...
                    </TableCell>
                  </TableRow>
                ) : filteredCollections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                      No collections assigned to you yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCollections.map((col) => (
                    <TableRow key={col.id}>
                      <TableCell className="text-xs font-medium text-foreground">
                        {col.shopName}
                      </TableCell>
                      <TableCell className="text-xs">
                        {col.companyName || col.brandName ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted border border-border text-foreground">
                            {col.companyName || col.brandName}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {col.invoiceNo}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {col.gstinUin || "-"}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {col.items.length}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        {formatCurrency(col.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredCollections.length > 0 && (
            <PaginationBar
              currentPage={colPage}
              totalItems={filteredCollections.length}
              pageSize={colPageSize}
              onPageChange={setColPage}
              onPageSizeChange={(newSize) => {
                setColPageSize(newSize);
                setColPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
            />
          )}
        </CardContent>
      </Card>

      {/* Assigned Shops List */}
      <Card className="border-border">
        <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My Assigned Shops ({shops.length})
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
                      No shops mapped to your profile.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedShops.map((shop, idx) => (
                    <TableRow key={shop.id || `${shop.name}_${idx}`}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {(shopPage - 1) * shopPageSize + idx + 1}
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
              currentPage={shopPage}
              totalItems={shops.length}
              pageSize={shopPageSize}
              onPageChange={setShopPage}
              onPageSizeChange={(newSize) => {
                setShopPageSize(newSize);
                setShopPage(1);
              }}
              pageSizeOptions={[5, 10, 20]}
            />
          )}
        </CardContent>
      </Card>
    </ErpContainer>
  );
}
