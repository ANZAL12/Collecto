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
import {
  simulateParseExcelFile,
  parseSalesRegisterExcelFile,
  ExcelValidationResult,
} from "@/lib/excel-parser";
import {
  useUploadBatches,
  useSaveCollectionsMutation,
  useDeleteUploadBatchMutation,
  useUpdateUploadBatchFileNameMutation,
  useShops,
  useCompanies,
  useExecutives,
  useShopCollections,
} from "@/lib/hooks/use-queries";
import {
  RotateCcw,
  ArrowRight,
  Check,
  Loader2,
  Trash2,
  Pencil,
  X,
  FileSpreadsheet,
  UploadCloud,
  Building2,
  Info,
  Sparkles,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CompanySelectBar } from "@/components/upload/company-select-bar";
import { CompanyManagerDialog } from "@/components/upload/company-manager-dialog";
import { Company } from "@/types";
import { cn } from "@/lib/utils";
import { useUploadDraft } from "@/lib/upload-draft-context";

export default function AdminDashboardPage() {
  const {
    validationResult,
    setValidationResult,
    draftFile,
    setDraftFile,
    activeParser,
    setActiveParser,
    selectedCompany,
    setSelectedCompany,
    showWarningsOnly,
    setShowWarningsOnly,
    isCommitted,
    setIsCommitted,
    updateShopExecutive: handleUpdateShopExecutive,
    clearDraft,
  } = useUploadDraft();

  const selectedFile = draftFile;
  const setSelectedFile = setDraftFile;

  const [showCompanyManager, setShowCompanyManager] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
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
  const { data: executives = [] } = useExecutives();
  const { data: existingCollections = [] } = useShopCollections();
  const saveCollectionsMutation = useSaveCollectionsMutation();
  const deleteBatchMutation = useDeleteUploadBatchMutation();
  const updateFileNameMutation = useUpdateUploadBatchFileNameMutation();

  // Enrich parsed collections with duplicate voucher detection against existing DB records and within file
  const collectionsWithDuplicateFlags = React.useMemo(() => {
    if (!validationResult?.collections) return [];

    const dbVouchers = new Set(
      existingCollections
        .map((c) => c.invoiceNo?.trim().toLowerCase())
        .filter((v): v is string => Boolean(v && v !== "-"))
    );

    const seenInBatch = new Set<string>();

    return validationResult.collections.map((shop) => {
      const v = shop.invoiceNo?.trim().toLowerCase();
      let isDuplicateVoucher = Boolean(shop.isDuplicateVoucher);
      let duplicateReason = shop.duplicateReason;

      if (v && v !== "-") {
        if (dbVouchers.has(v)) {
          isDuplicateVoucher = true;
          duplicateReason = `Voucher "${shop.invoiceNo}" already exists in database (cannot be added again)`;
        } else if (seenInBatch.has(v)) {
          isDuplicateVoucher = true;
          duplicateReason = `Duplicate voucher "${shop.invoiceNo}" in file (only first occurrence will be added)`;
        } else {
          seenInBatch.add(v);
        }
      }

      return {
        ...shop,
        isDuplicateVoucher,
        duplicateReason,
      };
    });
  }, [validationResult?.collections, existingCollections]);

  // Read URL query param to activate parser2 if routed with ?parser=2
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("parser");
      if (p === "2" || p === "parser2" || p === "sales-register") {
        setActiveParser("parser2");
      }
    }
  }, []);

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

  // Ensure selectedCompany is always valid for the active parser
  React.useEffect(() => {
    if (companies.length === 0) return;

    if (activeParser === "parser1") {
      // Parser 1 requires a concrete company, NOT "ALL" and NOT null
      if (!selectedCompany || selectedCompany.id === "ALL") {
        setSelectedCompany(companies[0]);
      }
    } else {
      // Parser 2 defaults to "ALL" if not set
      if (!selectedCompany) {
        setSelectedCompany({ id: "ALL", name: "All Companies", code: "ALL" });
      }
    }
  }, [activeParser, companies, selectedCompany]);

  const lastParsedKeyRef = React.useRef<string>("");

  const handleSwitchParser = (mode: "parser1" | "parser2") => {
    if (isSaving) return;
    setActiveParser(mode);
    clearDraft();
    lastParsedKeyRef.current = "";

    if (mode === "parser2") {
      // In Parser 2 mode, default to All Companies
      setSelectedCompany({ id: "ALL", name: "All Companies", code: "ALL" });
    } else {
      // In Parser 1 mode, default to first company
      if (companies.length > 0) {
        setSelectedCompany(companies[0]);
      }
    }
  };

  const executeParsing = async (file: File, parserMode: "parser1" | "parser2", company: Company | null) => {
    setIsProcessing(true);
    setIsCommitted(false);

    try {
      if (parserMode === "parser2") {
        // PARSER 2: Sales Register parsing (Voucher type determines company, Retail Bill ignored)
        const isFiltered = company && company.id !== "ALL";
        const result = await parseSalesRegisterExcelFile(
          file,
          existingShops,
          companies,
          isFiltered ? company.id : undefined,
          isFiltered ? company.name : undefined
        );
        setValidationResult(result);
      } else {
        // PARSER 1: Original parsing technique
        const targetCompany =
          company && company.id !== "ALL"
            ? company
            : (companies.length > 0 ? companies[0] : null);

        const result = await simulateParseExcelFile(
          file,
          existingShops,
          targetCompany?.id,
          targetCompany?.name
        );

        // Smart fallback: If Parser 1 finds 0 collections, test if this file is in Sales Register format
        if (result.collections.length === 0) {
          try {
            const srResult = await parseSalesRegisterExcelFile(
              file,
              existingShops,
              companies
            );
            if (srResult.collections.length > 0) {
              setActiveParser("parser2");
              setSelectedCompany({ id: "ALL", name: "All Companies", code: "ALL" });
              setValidationResult(srResult);
              return;
            }
          } catch {
            // retain Parser 1 result
          }
        }

        setValidationResult(result);
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      alert("Error parsing spreadsheet: " + (err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    const key = `${file.name}-${file.size}-${activeParser}-${selectedCompany?.id}`;
    lastParsedKeyRef.current = key;
    await executeParsing(file, activeParser, selectedCompany);
  };

  const isFirstMountRef = React.useRef(true);

  // Re-match against registered shops if target company changes while file is selected
  React.useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (selectedFile) {
        lastParsedKeyRef.current = `${selectedFile.name}-${selectedFile.size}-${activeParser}-${selectedCompany?.id}`;
      }
      return;
    }

    if (selectedFile && !isCommitted && !isProcessing) {
      const key = `${selectedFile.name}-${selectedFile.size}-${activeParser}-${selectedCompany?.id}`;
      if (lastParsedKeyRef.current !== key) {
        lastParsedKeyRef.current = key;
        executeParsing(selectedFile, activeParser, selectedCompany);
      }
    }
  }, [selectedCompany?.id, selectedCompany?.name, activeParser, selectedFile]);

  const handleReset = () => {
    if (isSaving) return;
    clearDraft();
    lastParsedKeyRef.current = "";
  };

  const handleCommit = async () => {
    if (!validationResult || isSaving || isCommitted) return;

    const targetCompany =
      activeParser === "parser1"
        ? (selectedCompany && selectedCompany.id !== "ALL" ? selectedCompany : (companies[0] || null))
        : selectedCompany;

    if (activeParser === "parser1" && !targetCompany) {
      alert("Please select a target company or brand before processing collections.");
      return;
    }

    if (validationResult.collections.length === 0) {
      alert("No valid collections found to save.");
      return;
    }

    // Check if ALL collections are duplicate vouchers
    const nonDuplicateCollections = collectionsWithDuplicateFlags.filter(
      (c) => !c.isDuplicateVoucher
    );

    if (nonDuplicateCollections.length === 0 && collectionsWithDuplicateFlags.length > 0) {
      alert(
        "All collections in this preview are duplicate vouchers that already exist in the database. Duplicates cannot be added again."
      );
      return;
    }

    setIsSaving(true);
    try {
      const isFiltered = targetCompany && targetCompany.id !== "ALL";
      const res = await saveCollectionsMutation.mutateAsync({
        fileName: validationResult.fileName,
        collections: collectionsWithDuplicateFlags,
        companyId: isFiltered ? targetCompany?.id : undefined,
        companyName: isFiltered ? targetCompany?.name : undefined,
      });

      if (!res.success) {
        alert(res.error || "Failed to process collections");
        return;
      }

      if (res.skippedDuplicatesCount && res.skippedDuplicatesCount > 0) {
        alert(
          `Success: ${res.savedCount || nonDuplicateCollections.length} new collections saved.\n${res.skippedDuplicatesCount} duplicate voucher(s) were skipped and not added again.`
        );
      }

      setIsCommitted(true);
      clearDraft();
    } catch (err: any) {
      alert("Error saving collections: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBatch = async (batchId: string, fileName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${fileName}" and all associated shop collections?`
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
      title="Upload Sale Details"
      badge={activeParser === "parser1" ? "Parser 1" : "Parser 2"}
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
      {/* Parsing Technique Selector on Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border">
          <button
            type="button"
            onClick={() => handleSwitchParser("parser1")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
              activeParser === "parser1"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UploadCloud className="h-3.5 w-3.5 text-primary" />
            <span>Haier and Zoom Upload</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground">
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchParser("parser2")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
              activeParser === "parser2"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UploadCloud className="h-3.5 w-3.5 text-emerald-500" />
            <span>Other Brands Uploads</span>
          </button>
        </div>
      </div>

      {/* Parser 2 Rules Notice */}
      {activeParser === "parser2" && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">
              Parser 2 Active (Sales Register Rules):
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>
                Vouchers with type <strong className="text-foreground">&quot;Retail Bill&quot;</strong> are automatically ignored.
              </li>
              <li>
                Voucher types (e.g. <span className="font-mono text-foreground">CARRIER AC, FORMENTY, GENERAL, ROCKWELL</span>) determine the company.
              </li>
              <li>
                If a specific company is selected below, <strong className="text-foreground">only that company&apos;s invoices and items</strong> will be parsed.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Target Company / Brand Selection */}
      <CompanySelectBar
        selectedCompanyId={
          selectedCompany?.id && (activeParser === "parser2" || selectedCompany.id !== "ALL")
            ? selectedCompany.id
            : (activeParser === "parser2" ? "ALL" : (companies[0]?.id || ""))
        }
        onSelectCompany={(comp) => setSelectedCompany(comp)}
        disabled={isSaving}
        allowAll={activeParser === "parser2"}
        label={activeParser === "parser2" ? "Target Company / Brand Filter" : "Target Company / Brand"}
        description={
          activeParser === "parser2"
            ? "Select a company to parse only that brand, or choose 'All Companies' to auto-categorize all voucher types."
            : "Invoices will be recorded under this brand for each retail shop."
        }
      />

      {/* Upload Dropzone / Validation Area */}
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
            companyName={
              activeParser === "parser2" && (!selectedCompany || selectedCompany.id === "ALL")
                ? "All Companies (Auto-matched)"
                : selectedCompany?.name
            }
            totalRows={validationResult.totalRows}
            validRows={validationResult.validRows}
            warningRows={validationResult.warningRows}
            errorRows={validationResult.errorRows}
            onFileNameChange={(newName) => {
              setValidationResult((prev) => (prev ? { ...prev, fileName: newName } : null));
            }}
            onToggleWarnings={() => setShowWarningsOnly((prev) => !prev)}
            isWarningsActive={showWarningsOnly}
          />

          <UploadPreview
            collections={collectionsWithDuplicateFlags}
            executives={executives}
            onUpdateShopExecutive={handleUpdateShopExecutive}
            showWarningsOnly={showWarningsOnly}
            onToggleWarningsOnly={setShowWarningsOnly}
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="h-8 text-xs cursor-pointer"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Upload Another File
            </Button>

            <Button
              size="sm"
              onClick={handleCommit}
              disabled={isCommitted || isSaving || validationResult.collections.length === 0}
              className="h-8 text-xs font-medium min-w-[140px] cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Saving to Database...
                </>
              ) : isCommitted ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  Saved to Collections
                </>
              ) : (
                <>
                  <span>Save Collections ({validationResult.collections.length})</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>

          {isCommitted && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>
                Successfully saved {validationResult.collections.length} collections to Supabase.
                Executives can now view their assigned shops in the field portal.
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/collections"
                  className="font-medium underline hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  View Collections
                </Link>
                <span>•</span>
                <Link
                  href="/admin/upload-history"
                  className="font-medium underline hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  View History
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Upload History */}
      <Card className="border-border">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
          <CardTitle className="text-xs font-semibold text-foreground">
            Recent Upload History
          </CardTitle>
          <Link
            href="/admin/upload-history"
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
          >
            View All ({recentBatches.length})
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
                  <TableHead className="text-xs text-right">Total Shops</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-16 text-center text-xs text-muted-foreground">
                      No upload batches recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBatches.map((batch) => (
                    <TableRow key={batch.id} className="border-b border-border hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-foreground font-medium">
                        {editingBatchId === batch.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingBatchName}
                              onChange={(e) => setEditingBatchName(e.target.value)}
                              className="h-6 px-1.5 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring min-w-[200px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateBatchFileName(batch.id, editingBatchName);
                                if (e.key === "Escape") setEditingBatchId(null);
                              }}
                            />
                            <button
                              onClick={() => handleUpdateBatchFileName(batch.id, editingBatchName)}
                              disabled={savingBatchNameId === batch.id}
                              className="p-1 text-emerald-500 hover:text-emerald-400"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setEditingBatchId(null)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span>{batch.fileName}</span>
                            <button
                              onClick={() => {
                                setEditingBatchId(batch.id);
                                setEditingBatchName(batch.fileName);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded transition-opacity"
                              title="Rename batch file"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {batch.companyName || batch.brandName ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono px-1.5 py-0 border-border bg-card"
                          >
                            {batch.companyName || batch.brandName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground font-mono text-[11px]">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {batch.uploadedAt
                          ? new Date(batch.uploadedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-foreground font-semibold">
                        {batch.totalRows || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.fileName)}
                            disabled={deletingBatchId === batch.id}
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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
