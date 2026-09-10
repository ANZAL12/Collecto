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
import { PaginationBar } from "@/components/ui/pagination-bar";

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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const paginatedMappings = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return mappings.slice(start, start + pageSize);
  }, [mappings, currentPage, pageSize]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 border-b border-border">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Shop Mappings Directory ({mappings.length})
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

        {mappings.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalItems={mappings.length}
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
