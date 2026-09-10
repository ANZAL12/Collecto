"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { UploadHistoryTable } from "@/components/upload/upload-history-table";
import { Button } from "@/components/ui/button";
import {
  useUploadBatches,
  useDeleteUploadBatchMutation,
  useUpdateUploadBatchFileNameMutation,
} from "@/lib/hooks/use-queries";
import { RefreshCw, Trash2, AlertTriangle, Check, X } from "lucide-react";

export default function AdminUploadHistoryPage() {
  const { data: history = [], isFetching, refetch } = useUploadBatches();
  const deleteBatchMutation = useDeleteUploadBatchMutation();
  const updateFileNameMutation = useUpdateUploadBatchFileNameMutation();

  const [batchToDelete, setBatchToDelete] = React.useState<{ id: string; fileName: string } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleOpenDeleteModal = (batchId: string, fileName: string) => {
    setBatchToDelete({ id: batchId, fileName });
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;

    setIsDeleting(true);
    try {
      const res = await deleteBatchMutation.mutateAsync(batchToDelete.id);
      if (res.success) {
        showNotice(`Batch "${batchToDelete.fileName}" and its associated collections deleted successfully!`);
        setBatchToDelete(null);
        refetch();
      } else {
        showNotice(res.error || "Failed to delete upload batch", "error");
      }
    } catch (err: any) {
      showNotice(err.message || "Failed to delete upload batch", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateFileName = async (batchId: string, newFileName: string) => {
    const res = await updateFileNameMutation.mutateAsync({ batchId, newFileName });
    if (res.success) {
      showNotice(`File renamed to "${newFileName}"`);
      refetch();
    } else {
      showNotice(res.error || "Failed to update file name", "error");
    }
  };

  return (
    <ErpContainer
      title="Upload Audit History"
      badge="Admin"
      description="Permanent audit trail of processed collection spreadsheets, row counts, and error summaries."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 text-xs font-mono gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-2 p-2.5 px-3.5 text-xs rounded border font-mono animate-in fade-in duration-150 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <UploadHistoryTable
        history={history}
        onDelete={handleOpenDeleteModal}
        onUpdateFileName={handleUpdateFileName}
        deletingBatchId={isDeleting ? batchToDelete?.id : null}
      />

      {/* In-App Delete Confirmation Modal (Guaranteed to work across all browsers) */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Delete Upload Batch?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
                  &ldquo;{batchToDelete.fileName}&rdquo;
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                <span>Permanent Removal Warning</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Deleting this batch will permanently remove the spreadsheet audit record, along with all associated shop collections and itemized product breakdown rows from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchToDelete(null)}
                disabled={isDeleting}
                className="h-8 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-8 text-xs font-medium gap-1.5 min-w-[120px]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </ErpContainer>
  );
}
