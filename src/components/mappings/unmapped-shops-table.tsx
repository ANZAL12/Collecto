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
import { Search, Trash2, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useExecutives } from "@/lib/hooks/use-queries";

interface UnmappedShopsTableProps {
  mappings: ShopMapping[];
  onAssign?: (shopId: string) => void;
  onDeleteShop?: (shopId: string, shopName: string) => Promise<void> | void;
  onDeleteAll?: () => Promise<void> | void;
  className?: string;
}

export function UnmappedShopsTable({
  mappings,
  onAssign,
  onDeleteShop,
  onDeleteAll,
  className,
}: UnmappedShopsTableProps) {
  const { data: dbExecutives = [] } = useExecutives();
  const [search, setSearch] = React.useState("");
  const [executiveFilter, setExecutiveFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "unmapped" | "mapped">("ALL");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // State for single delete confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<ShopMapping | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = React.useState(false);

  // State for delete all confirmation
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = React.useState(false);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

  const unmappedCount = React.useMemo(
    () => mappings.filter((m) => m.status === "unmapped").length,
    [mappings]
  );

  // Collect unique executive options from both database executives and current mappings
  const executiveOptions = React.useMemo(() => {
    const names = new Set<string>();
    dbExecutives.forEach((e) => {
      if (e.name) names.add(e.name.trim());
    });
    mappings.forEach((m) => {
      if (m.executiveName) names.add(m.executiveName.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [dbExecutives, mappings]);

  // Count mappings per executive
  const execCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of mappings) {
      if (m.executiveName) {
        const key = m.executiveName.trim().toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [mappings]);

  const filteredMappings = React.useMemo(() => {
    return mappings.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.shopName.toLowerCase().includes(q) ||
        (item.executiveName && item.executiveName.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;

      const matchesExecutive =
        executiveFilter === "ALL" ||
        (executiveFilter === "UNASSIGNED"
          ? !item.executiveName
          : item.executiveName?.toLowerCase() === executiveFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesExecutive;
    });
  }, [mappings, search, statusFilter, executiveFilter]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, executiveFilter]);

  const paginatedMappings = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMappings.slice(start, start + pageSize);
  }, [filteredMappings, currentPage, pageSize]);

  const handleConfirmDeleteSingle = async () => {
    if (!deleteTarget || !onDeleteShop) return;
    setIsDeletingSingle(true);
    try {
      await onDeleteShop(deleteTarget.shopId, deleteTarget.shopName);
      setDeleteTarget(null);
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (!onDeleteAll) return;
    setIsDeletingAll(true);
    try {
      await onDeleteAll();
      setShowDeleteAllConfirm(false);
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search, executive filter, status filter, and bulk actions bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2 w-full">
          <div className="relative flex-1 min-w-[200px]">
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

          {/* Executive Filter */}
          <select
            value={executiveFilter}
            onChange={(e) => setExecutiveFilter(e.target.value)}
            className="h-8 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900 shrink-0 font-medium"
            title="Filter by assigned executive"
          >
            <option value="ALL">All Executives ({mappings.length})</option>
            <option value="UNASSIGNED">Unassigned ({unmappedCount})</option>
            {executiveOptions.map((name) => (
              <option key={name} value={name}>
                {name} ({execCounts[name.toLowerCase()] || 0})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900 shrink-0"
          >
            <option value="ALL">All Status</option>
            <option value="unmapped">Unmapped ({unmappedCount})</option>
            <option value="mapped">Mapped ({mappings.length - unmappedCount})</option>
          </select>

          {/* Reset Filters */}
          {(search || executiveFilter !== "ALL" || statusFilter !== "ALL") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setExecutiveFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="h-8 text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 gap-1"
              title="Clear all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {onDeleteAll && mappings.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteAllConfirm(true)}
            className="h-8 text-xs font-mono text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 gap-1.5 shrink-0"
            title="Delete all registered shops and mappings"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete All ({mappings.length})</span>
          </Button>
        )}
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
                  <TableHead className="w-32 text-right text-xs pr-4">Actions</TableHead>
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
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {item.shopName}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.executiveName ? (
                          <span className="text-foreground font-medium">{item.executiveName}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] px-2 font-mono"
                            onClick={() => onAssign && onAssign(item.shopId)}
                          >
                            {item.status === "unmapped" ? "Assign" : "Reassign"}
                          </Button>
                          {onDeleteShop && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(item)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title={`Delete "${item.shopName}"`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive/80" />
                            </Button>
                          )}
                        </div>
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

      {/* Single Shop Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <Card className="w-full max-w-sm border-border bg-card p-4 shadow-xl space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Delete Shop Mapping</h3>
                <p className="text-[11px] text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
              Are you sure you want to delete <strong className="text-foreground font-semibold">{deleteTarget.shopName}</strong>? Its executive mapping will also be removed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeletingSingle}
                className="h-8 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDeleteSingle}
                disabled={isDeletingSingle}
                className="h-8 text-xs font-medium gap-1.5"
              >
                {isDeletingSingle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete Shop</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete ALL Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <Card className="w-full max-w-sm border-border bg-card p-4 shadow-xl space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Delete ALL Shop Mappings</h3>
                <p className="text-[11px] text-muted-foreground">Permanent action • Cannot be undone</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground bg-destructive/5 border border-destructive/20 p-2.5 rounded-lg">
              <p className="font-semibold text-destructive">
                Warning: You are about to delete all {mappings.length} registered shops and mappings!
              </p>
              <p className="text-[11px]">
                All shop records will be completely removed from the master database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={isDeletingAll}
                className="h-8 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="h-8 text-xs font-medium gap-1.5"
              >
                {isDeletingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Delete All ({mappings.length})</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
