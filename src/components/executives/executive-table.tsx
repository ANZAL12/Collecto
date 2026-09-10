import * as React from "react";
import { Executive } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";

interface ExecutiveTableProps {
  executives: Executive[];
  className?: string;
}

export function ExecutiveTable({ executives, className }: ExecutiveTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const paginatedExecutives = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return executives.slice(start, start + pageSize);
  }, [executives, currentPage, pageSize]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 border-b border-border">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Executive Members ({executives.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="w-12 text-center text-xs">#</TableHead>
                <TableHead className="text-xs">Executive Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-16 text-center text-xs text-muted-foreground">
                    No executive members registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExecutives.map((exec, idx) => (
                  <TableRow key={exec.id}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {exec.name}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {executives.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalItems={executives.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50]}
          />
        )}
      </CardContent>
    </Card>
  );
}
