"use client";

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
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, KeyRound, ExternalLink, Trash2, AlertTriangle } from "lucide-react";

interface ExecutiveTableProps {
  executives: Executive[];
  companiesMap?: Map<string, string[]>;
  className?: string;
  onEditCredentials?: (exec: Executive) => void;
  onDeleteExecutive?: (exec: Executive) => Promise<void> | void;
}

export function ExecutiveTable({
  executives,
  companiesMap,
  className,
  onEditCredentials,
  onDeleteExecutive,
}: ExecutiveTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [revealedPasswords, setRevealedPasswords] = React.useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = React.useState<Executive | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !onDeleteExecutive) return;
    setIsDeleting(true);
    try {
      await onDeleteExecutive(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const paginatedExecutives = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return executives.slice(start, start + pageSize);
  }, [executives, currentPage, pageSize]);

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 border-b border-border">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Executive Accounts ({executives.length})
          </CardTitle>
          <span className="text-[11px] font-mono text-muted-foreground">
            Default password: <code className="bg-muted px-1 py-0.5 rounded font-mono">password123</code>
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/20">
                  <TableHead className="w-12 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs">Executive Name</TableHead>
                  <TableHead className="text-xs">Companies Handled</TableHead>
                  <TableHead className="text-xs">Login Username</TableHead>
                  <TableHead className="text-xs">Login Password</TableHead>
                  <TableHead className="w-40 text-right text-xs pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">
                      No executive members registered yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExecutives.map((exec, idx) => {
                    const isRevealed = revealedPasswords.has(exec.id);
                    const username =
                      exec.username ||
                      exec.name
                        .toLowerCase()
                        .split(/\s+/)[0]
                        .replace(/[^a-z0-9]/g, "");
                    const password = exec.password || "password123";
                    const companies = companiesMap?.get(exec.name.trim().toLowerCase()) || [];
                    const isMultiCompany = companies.length > 1;

                    return (
                      <TableRow key={exec.id} className="hover:bg-muted/30">
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {exec.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          {companies.length === 0 ? (
                            <span className="text-[11px] font-mono text-muted-foreground italic">
                              Unassigned
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                              {companies.map((comp) => (
                                <span
                                  key={comp}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border text-foreground font-mono"
                                >
                                  {comp}
                                </span>
                              ))}
                              {isMultiCompany && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  Multi-Company ({companies.length})
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-foreground">
                          <span className="px-2 py-0.5 rounded bg-muted border border-border text-[11px]">
                            {username}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px]">
                              {isRevealed ? password : "••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(exec.id)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title={isRevealed ? "Hide password" : "Show password"}
                            >
                              {isRevealed ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            {onEditCredentials && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditCredentials(exec)}
                                className="h-7 px-1.5 text-[11px] font-mono gap-1 text-muted-foreground hover:text-foreground"
                                title="Edit Credentials"
                              >
                                <KeyRound className="h-3 w-3" />
                                <span>Edit</span>
                              </Button>
                            )}
                            <a
                              href={`/executive/details?name=${encodeURIComponent(exec.name)}`}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-foreground hover:underline px-1.5 py-1"
                              title="View Field Details"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View</span>
                            </a>
                            {onDeleteExecutive && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(exec)}
                                className="h-7 px-1.5 text-[11px] font-mono text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Delete Executive"
                              >
                                <Trash2 className="h-3 w-3 text-destructive/80" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm border-border bg-card shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <CardHeader className="pb-2 pt-4 px-4 border-b border-border flex flex-row items-center gap-2">
              <div className="rounded-full bg-destructive/10 p-1.5 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-semibold">Delete Executive</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
              <p>
                Are you sure you want to delete executive{" "}
                <strong className="text-foreground font-semibold">{deleteTarget.name}</strong>?
              </p>
              <p className="text-[11px] text-muted-foreground/90">
                Any shops and collections currently assigned to this executive will become unassigned.
              </p>
            </CardContent>
            <div className="flex justify-end gap-2 px-4 pb-3.5 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="h-8 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="h-8 text-xs font-medium gap-1"
              >
                {isDeleting ? "Deleting..." : "Delete Executive"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
