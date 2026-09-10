import * as React from "react";
import { ShopMapping } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Search } from "lucide-react";

interface UnmappedShopsTableProps {
  mappings: ShopMapping[];
  onAssign?: (shopId: string) => void;
  className?: string;
}

export function UnmappedShopsTable({
  mappings,
  onAssign,
  className,
}: UnmappedShopsTableProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "unmapped" | "mapped">("ALL");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const unmappedCount = React.useMemo(
    () => mappings.filter((m) => m.status === "unmapped").length,
    [mappings]
  );

  const filteredMappings = React.useMemo(() => {
    return mappings.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.shopName.toLowerCase().includes(q) ||
        (item.executiveName && item.executiveName.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [mappings, search, statusFilter]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const paginatedMappings = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMappings.slice(start, start + pageSize);
  }, [filteredMappings, currentPage, pageSize]);

  return (
    <div className="space-y-3">
      {/* Search and status filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
          </div>
          <Input
            type="text"
            placeholder="Search by shop name or executive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-8"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-8 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900 w-full sm:w-auto"
        >
          <option value="ALL">All Mappings ({mappings.length})</option>
          <option value="unmapped">Unmapped Only ({unmappedCount})</option>
          <option value="mapped">Mapped Only ({mappings.length - unmappedCount})</option>
        </select>
      </div>

      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 border-b border-border">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shop Mappings Directory ({filteredMappings.length} {unmappedCount > 0 ? `• ${unmappedCount} need assignment` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="w-12 text-center text-xs">#</TableHead>
                <TableHead className="text-xs">Shop Name</TableHead>
                <TableHead className="text-xs">Assigned Executive</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-xs text-muted-foreground">
                    No shop mappings registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMappings.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {item.shopName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.executiveName ? (
                        <span className="text-foreground">{item.executiveName}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2"
                        onClick={() => onAssign && onAssign(item.shopId)}
                      >
                        {item.status === "unmapped" ? "Assign" : "Reassign"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredMappings.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalItems={filteredMappings.length}
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
    </div>
  );
}
