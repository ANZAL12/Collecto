"use client";

import * as React from "react";
import Link from "next/link";
import { ErpContainer } from "@/components/layout/erp-container";
import { ExcelDropzone } from "@/components/upload/excel-dropzone";
import { UploadStatus } from "@/components/upload/upload-status";
import { UploadPreview } from "@/components/upload/upload-preview";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { simulateParseExcelFile, ExcelValidationResult } from "@/lib/excel-parser";
import {
  useUploadBatches,
  useSaveCollectionsMutation,
  useDeleteUploadBatchMutation,
  useUpdateUploadBatchFileNameMutation,
  useShops,
  useCompanies,
} from "@/lib/hooks/use-queries";
import { RotateCcw, ArrowRight, Check, Loader2, Trash2, Pencil, X } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CompanySelectBar } from "@/components/upload/company-select-bar";
import { CompanyManagerDialog } from "@/components/upload/company-manager-dialog";
import { Company } from "@/types";
import { Building2 } from "lucide-react";

export default function AdminDashboardPage() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null);
  const [showCompanyManager, setShowCompanyManager] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<ExcelValidationResult | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCommitted, setIsCommitted] = React.useState(false);
  const [deletingBatchId, setDeletingBatchId] = React.useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = React.useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = React.useState("");
  const [savingBatchNameId, setSavingBatchNameId] = React.useState<string | null>(null);

  // Pagination state for recent uploads
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(5);

  const { data: recentBatches = [] } = useUploadBatches();
  const { data: existingShops = [] } = useShops();
  const { data: companies = [] } = useCompanies();
  const saveCollectionsMutation = useSaveCollectionsMutation();
  const deleteBatchMutation = useDeleteUploadBatchMutation();
  const updateFileNameMutation = useUpdateUploadBatchFileNameMutation();

  // Pre-select company if routed from Companies Master with ?companyId=...
  React.useEffect(() => {
    if (typeof window !== "undefined" && companies.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const qCompId = params.get("companyId");
      if (qCompId) {
        const match = companies.find((c) => c.id === qCompId);
        if (match) {
          setSelectedCompany(match);
        }
      }
    }
  }, [companies]);

  const paginatedBatches = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return recentBatches.slice(start, start + pageSize);
  }, [recentBatches, currentPage, pageSize]);

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setIsCommitted(false);

    try {
      // Look up existing registered shops master, checking mappings for this particular company first
      const result = await simulateParseExcelFile(
        file,
        existingShops,
        selectedCompany?.id,
        selectedCompany?.name
      );
      setValidationResult(result);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-match against registered shops if target company changes while file is selected
  React.useEffect(() => {
    if (selectedFile && !isCommitted && !isProcessing) {
      simulateParseExcelFile(
        selectedFile,
        existingShops,
        selectedCompany?.id,
        selectedCompany?.name
      ).then((res) => {
        setValidationResult(res);
      });
    }
  }, [selectedCompany?.id, selectedCompany?.name]);

  const handleReset = () => {
    if (isSaving) return;
    setSelectedFile(null);
    setValidationResult(null);
    setIsCommitted(false);
  };

  const handleCommit = async () => {
    if (!validationResult || isSaving || isCommitted) return;
    if (!selectedCompany) {
      alert("Please select a target company or brand before processing collections.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveCollectionsMutation.mutateAsync({
        fileName: validationResult.fileName,
        collections: validationResult.collections,
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
      });
      if (!res.success) {
        alert(res.error || "Failed to process collections");
        return;
      }
      setIsCommitted(true);
    } catch (err: any) {
      alert("Error saving collections: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleUpdateBatchFileName = async (batchId: string, newFileName: string) => {
    const clean = newFileName.trim();
    if (!clean) return;
    setSavingBatchNameId(batchId);
    try {
      const res = await updateFileNameMutation.mutateAsync({ batchId, newFileName: clean });
      if (!res.success) {
        alert(res.error || "Failed to update file name");
      }
    } finally {
      setSavingBatchNameId(null);
      setEditingBatchId(null);
    }
  };

  return (
    <ErpContainer
      title="Upload Center"
      badge="Admin"
      description="Upload daily Excel spreadsheets to process collections and assign to executives."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCompanyManager(true)}
          className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
        >
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span>Manage Companies</span>
        </Button>
      }
    >
      {/* 0. Target Company / Brand Selection */}
      <CompanySelectBar
        selectedCompanyId={selectedCompany?.id || ""}
        onSelectCompany={(comp) => setSelectedCompany(comp)}
        disabled={isSaving}
      />

      {/* 1. Upload Dropzone / Validation Area */}
      {!validationResult ? (
        <ExcelDropzone
          onFileSelected={handleFileSelected}
          isProcessing={isProcessing}
          selectedFile={selectedFile}
        />
      ) : (
        <div className="space-y-3">
          <UploadStatus
            fileName={validationResult.fileName}
            companyName={selectedCompany?.name}
            totalRows={validationResult.totalRows}
            validRows={validationResult.validRows}
            warningRows={validationResult.warningRows}
            errorRows={validationResult.errorRows}
            onFileNameChange={(newName) => {
              setValidationResult((prev) => (prev ? { ...prev, fileName: newName } : null));
            }}
          />

          <UploadPreview
            collections={validationResult.collections}
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Upload Another File
            </Button>

            <Button
              size="sm"
              onClick={handleCommit}
              disabled={isCommitted || isSaving}
              className="h-8 text-xs font-medium min-w-[140px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Saving to Database...
                </>
              ) : isCommitted ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Processed & Saved to Database
                </>
              ) : (
                <>
                  <span>Process Collections</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 2. Recent Upload History */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Uploads ({recentBatches.length})
          </CardTitle>
          <Link
            href="/admin/upload-history"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Full History →
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/20">
                  <TableHead className="text-xs">File Name</TableHead>
                  <TableHead className="text-xs">Company / Brand</TableHead>
                  <TableHead className="text-xs">Upload Date</TableHead>
                  <TableHead className="text-xs text-center">Items Parsed</TableHead>
                  <TableHead className="text-xs text-right">Status</TableHead>
                  <TableHead className="text-xs text-right w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">
                      No spreadsheets uploaded yet. Drop an Excel file above to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="text-xs font-medium text-foreground">
                        {editingBatchId === batch.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingBatchName}
                              onChange={(e) => setEditingBatchName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleUpdateBatchFileName(batch.id, editingBatchName);
                                if (e.key === "Escape") setEditingBatchId(null);
                              }}
                              autoFocus
                              disabled={savingBatchNameId === batch.id}
                              className="h-7 px-2 text-xs border border-primary rounded bg-background text-foreground font-semibold focus:outline-none min-w-[180px]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBatchFileName(batch.id, editingBatchName)
                              }
                              disabled={savingBatchNameId === batch.id}
                              className="p-1 text-foreground hover:bg-muted rounded"
                              title="Save"
                            >
                              {savingBatchNameId === batch.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBatchId(null)}
                              disabled={savingBatchNameId === batch.id}
                              className="p-1 text-muted-foreground hover:bg-muted rounded"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium text-foreground">{batch.fileName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {batch.companyName ? (
                          <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20">
                            {batch.companyName}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {batch.uploadedAt}
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono text-muted-foreground">
                        {batch.totalRows}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBatchId(batch.id);
                              setEditingBatchName(batch.fileName);
                            }}
                            disabled={editingBatchId === batch.id || savingBatchNameId === batch.id}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            title="Rename file"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(batch.id, batch.fileName)}
                            disabled={deletingBatchId === batch.id}
                            className="p-1 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete this upload batch"
                          >
                            {deletingBatchId === batch.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {recentBatches.length > 0 && (
            <PaginationBar
              currentPage={currentPage}
              totalItems={recentBatches.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 25]}
            />
          )}
        </CardContent>
      </Card>

      {/* Manual Company / Brand Manager Dialog */}
      <CompanyManagerDialog
        isOpen={showCompanyManager}
        onClose={() => setShowCompanyManager(false)}
        selectedCompanyId={selectedCompany?.id}
        onSelectCompany={(comp) => setSelectedCompany(comp)}
      />
    </ErpContainer>
  );
}
