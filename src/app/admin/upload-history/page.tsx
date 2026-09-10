"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { UploadHistoryTable } from "@/components/upload/upload-history-table";
import {
  useUploadBatches,
  useDeleteUploadBatchMutation,
  useUpdateUploadBatchFileNameMutation,
} from "@/lib/hooks/use-queries";

export default function AdminUploadHistoryPage() {
  const { data: history = [] } = useUploadBatches();
  const deleteBatchMutation = useDeleteUploadBatchMutation();
  const updateFileNameMutation = useUpdateUploadBatchFileNameMutation();
  const [deletingBatchId, setDeletingBatchId] = React.useState<string | null>(null);

  const handleDeleteBatch = async (batchId: string, fileName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete batch "${fileName}"? This will permanently remove all associated collections and items.`
      )
    ) {
      return;
    }

    setDeletingBatchId(batchId);
    try {
      const res = await deleteBatchMutation.mutateAsync(batchId);
      if (!res.success) {
        alert(res.error || "Failed to delete batch");
      }
    } finally {
      setDeletingBatchId(null);
    }
  };

  const handleUpdateFileName = async (batchId: string, newFileName: string) => {
    const res = await updateFileNameMutation.mutateAsync({ batchId, newFileName });
    if (!res.success) {
      alert(res.error || "Failed to update file name");
    }
  };

  return (
    <ErpContainer
      title="Upload Audit History"
      badge="Admin"
      description="Permanent audit trail of processed collection spreadsheets, row counts, and error summaries."
    >
      <UploadHistoryTable
        history={history}
        onDelete={handleDeleteBatch}
        onUpdateFileName={handleUpdateFileName}
        deletingBatchId={deletingBatchId}
      />
    </ErpContainer>
  );
}
