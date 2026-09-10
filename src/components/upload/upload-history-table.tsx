import * as React from "react";
import { UploadBatch } from "@/types";
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
import { Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";

interface UploadHistoryTableProps {
  history: UploadBatch[];
  onDelete?: (batchId: string, fileName: string) => void;
  onUpdateFileName?: (batchId: string, newFileName: string) => Promise<boolean | void>;
  deletingBatchId?: string | null;
  className?: string;
}

export function UploadHistoryTable({
  history,
  onDelete,
  onUpdateFileName,
  deletingBatchId,
  className,
}: UploadHistoryTableProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const paginatedHistory = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return history.slice(start, start + pageSize);
  }, [history, currentPage, pageSize]);

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSave = async (id: string) => {
    const clean = editingName.trim();
    if (clean && onUpdateFileName) {
      setSavingId(id);
      try {
        await onUpdateFileName(id, clean);
      } finally {
        setSavingId(null);
      }
    }
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <Card className={className}>
      <CardHeader className="py-2.5 px-4 border-b border-border">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Upload Audit History ({history.length} batches)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="text-xs">File Name</TableHead>
                <TableHead className="text-xs">Upload Date</TableHead>
                <TableHead className="text-xs text-center">Total Rows</TableHead>
                <TableHead className="text-xs text-right">Status</TableHead>
                {(onDelete || onUpdateFileName) && (
                  <TableHead className="text-xs text-right w-24">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={onDelete || onUpdateFileName ? 5 : 4}
                    className="h-20 text-center text-xs text-muted-foreground"
                  >
                    No upload batches recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-medium text-foreground">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(item.id);
                              if (e.key === "Escape") handleCancel();
                            }}
                            autoFocus
                            disabled={savingId === item.id}
                            className="h-7 px-2 text-xs border border-primary rounded bg-background text-foreground font-semibold focus:outline-none min-w-[200px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSave(item.id)}
                            disabled={savingId === item.id}
                            className="p-1 text-foreground hover:bg-muted rounded"
                            title="Save"
                          >
                            {savingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancel}
                            disabled={savingId === item.id}
                            className="p-1 text-muted-foreground hover:bg-muted rounded"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-medium text-foreground">{item.fileName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.uploadedAt}
                    </TableCell>
                    <TableCell className="text-xs text-center font-mono text-muted-foreground">
                      {item.totalRows}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {item.status || "completed"}
                      </Badge>
                    </TableCell>
                    {(onDelete || onUpdateFileName) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onUpdateFileName && (
                            <button
                              type="button"
                              onClick={() => startEdit(item.id, item.fileName)}
                              disabled={editingId === item.id || savingId === item.id}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                              title="Rename file"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(item.id, item.fileName)}
                              disabled={deletingBatchId === item.id}
                              className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Delete this upload batch"
                            >
                              {deletingBatchId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {history.length > 0 && (
          <PaginationBar
            currentPage={currentPage}
            totalItems={history.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        )}
      </CardContent>
    </Card>
  );
}
