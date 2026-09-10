"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Store,
  User,
  Building2,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useExecutives, useCompanies, useShops, useBulkAddShopsMutation } from "@/lib/hooks/use-queries";
import {
  extractShopNamesFromExcel,
  extractShopsFromRawRows,
  ExtractedExcelShopsResult,
} from "@/lib/excel-parser";

interface ExcelShopImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number, executiveName: string, companyName?: string) => void;
  defaultExecutiveName?: string;
  defaultCompanyId?: string;
}

export function ExcelShopImportDialog({
  isOpen,
  onClose,
  onSuccess,
  defaultExecutiveName,
  defaultCompanyId,
}: ExcelShopImportDialogProps) {
  const { data: executives = [] } = useExecutives();
  const { data: companies = [] } = useCompanies();
  const { data: registeredShops = [] } = useShops();
  const bulkAddMutation = useBulkAddShopsMutation();

  const [selectedExecutive, setSelectedExecutive] = React.useState<string>(defaultExecutiveName || "");
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string>(defaultCompanyId || "");
  const [file, setFile] = React.useState<File | null>(null);
  const [parseResult, setParseResult] = React.useState<ExtractedExcelShopsResult | null>(null);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [selectedColIndex, setSelectedColIndex] = React.useState<number>(-1);
  const [shopsList, setShopsList] = React.useState<string[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const chosenCompany = companies.find((c) => c.id === selectedCompanyId);

  const existingInSelectedCompanyCount = React.useMemo(() => {
    if (!shopsList.length) return 0;
    return shopsList.filter((name) => {
      const clean = name.trim().toLowerCase();
      return registeredShops.some((s) => {
        if (s.name.trim().toLowerCase() !== clean) return false;
        if (!selectedCompanyId) return !s.companyId && !s.companyName;
        return (
          s.companyId === selectedCompanyId ||
          s.brandId === selectedCompanyId ||
          (chosenCompany &&
            (s.companyName?.toLowerCase() === chosenCompany.name.toLowerCase() ||
              s.brandName?.toLowerCase() === chosenCompany.name.toLowerCase()))
        );
      });
    }).length;
  }, [shopsList, registeredShops, selectedCompanyId, chosenCompany]);

  // Set default executive
  React.useEffect(() => {
    if (!selectedExecutive && executives.length > 0) {
      setSelectedExecutive(defaultExecutiveName || executives[0].name);
    }
  }, [executives, selectedExecutive, defaultExecutiveName]);

  // Reset when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParseResult(null);
      setShopsList([]);
      setErrorMessage(null);
      setIsParsing(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  const handleProcessFile = async (uploadedFile: File) => {
    setErrorMessage(null);
    setFile(uploadedFile);
    setIsParsing(true);

    try {
      const res = await extractShopNamesFromExcel(uploadedFile, undefined, executives);
      setParseResult(res);
      setSelectedColIndex(res.targetCol);
      setShopsList(res.shops);

      if (res.detectedExecutive) {
        setSelectedExecutive(res.detectedExecutive);
      }

      if (res.shops.length === 0) {
        setErrorMessage(
          "No shop names could be detected in the Particulars column. Try choosing a different column from the dropdown."
        );
      }
    } catch (err: any) {
      console.error("Excel parse failed:", err);
      setErrorMessage(err.message || "Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleColumnChange = (colIdx: number) => {
    setSelectedColIndex(colIdx);
    if (parseResult) {
      const reParsed = extractShopsFromRawRows(parseResult.rawRows, colIdx, executives);
      setShopsList(reParsed.shops);
      if (reParsed.shops.length === 0) {
        setErrorMessage("No shop names found in this column.");
      } else {
        setErrorMessage(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleProcessFile(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleProcessFile(selected);
    }
  };

  const handleImport = async () => {
    if (!selectedExecutive) {
      setErrorMessage("Please select an executive to assign these shops to.");
      return;
    }
    if (shopsList.length === 0) {
      setErrorMessage("No shops to import.");
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const chosenCompany = companies.find((c) => c.id === selectedCompanyId);
      const res = await bulkAddMutation.mutateAsync({
        names: shopsList,
        executiveName: selectedExecutive,
        companyId: selectedCompanyId || undefined,
        companyName: chosenCompany?.name || undefined,
      });

      if (res.success) {
        if (onSuccess) {
          onSuccess(res.count, selectedExecutive, chosenCompany?.name);
        }
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to import shops.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <Card className="w-full max-w-lg border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Import Shops from Excel</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Upload a spreadsheet to bulk-add shops and assign them to an executive and company.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isImporting}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Scrollable Content */}
        <CardContent className="p-4 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* 1. Target Executive & Company Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Executive Selection */}
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="import-exec" className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Executive</span>
                  <span className="text-destructive">*</span>
                </Label>
              </div>

              <select
                id="import-exec"
                value={selectedExecutive}
                onChange={(e) => setSelectedExecutive(e.target.value)}
                disabled={isImporting}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                {executives.length === 0 ? (
                  <option value="">No executives registered</option>
                ) : (
                  executives.map((exec) => (
                    <option key={exec.id} value={exec.name}>
                      {exec.name}
                    </option>
                  ))
                )}
              </select>
              {parseResult?.detectedExecutive ? (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Detected "{parseResult.detectedExecutive}"</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Maps shops to this executive.
                </p>
              )}
            </div>

            {/* Company / Brand Selection */}
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="import-company" className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Company / Brand</span>
                </Label>
                <span className="text-[10px] font-mono text-muted-foreground">Optional</span>
              </div>

              <select
                id="import-company"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                disabled={isImporting}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">No Company / General</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} {comp.code ? `(${comp.code})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Link imported shops to brand.
              </p>
            </div>
          </div>

          {/* 2. File Upload Area */}
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-muted border border-border">
                  <UploadCloud className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Click to select or drag & drop Excel sheet
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports .xlsx, .xls, or .csv (Group Outstandings, sales registers, or particulars sheets)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* File Loaded View */
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                    setShopsList([]);
                  }}
                  disabled={isImporting}
                  className="h-6 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                >
                  Change File
                </Button>
              </div>

              {isParsing && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-mono text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning spreadsheet for Particulars column...</span>
                </div>
              )}

              {parseResult && !isParsing && (
                <div className="space-y-3">
                  {/* Column Picker */}
                  <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="col-select" className="text-xs flex items-center gap-1.5">
                        <span className="text-muted-foreground">Source Column:</span>
                        <span className="font-semibold text-foreground">
                          {parseResult.columns.find((c) => c.index === selectedColIndex)?.name || "Particulars"}
                        </span>
                      </Label>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {parseResult.columns[selectedColIndex]?.name.toLowerCase().includes("particular")
                          ? "✓ Particulars Column"
                          : "Auto-detected"}
                      </span>
                    </div>
                    {parseResult.columns.length > 1 && (
                      <select
                        id="col-select"
                        value={selectedColIndex}
                        onChange={(e) => handleColumnChange(Number(e.target.value))}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
                      >
                        {parseResult.columns.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.name} {col.sample[0] ? `(e.g. ${col.sample[0]})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Preview of Extracted Shops */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Shops to Add ({shopsList.length})</span>
                      </Label>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {shopsList.length} unique {shopsList.length === 1 ? "shop" : "shops"}
                      </span>
                    </div>

                    {existingInSelectedCompanyCount > 0 && (
                      <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Notice (Not Unique):</strong> {existingInSelectedCompanyCount} of{" "}
                          {shopsList.length} shops already exist under{" "}
                          {chosenCompany ? `"${chosenCompany.name}"` : "General"}. Importing will reassign their executive.
                        </span>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 divide-y divide-border/40 text-xs">
                      {shopsList.length === 0 ? (
                        <p className="py-4 text-center text-xs text-muted-foreground italic">
                          No shops detected in this column. Please choose another column.
                        </p>
                      ) : (
                        shopsList.map((shop, idx) => {
                          const isAlreadyMapped = registeredShops.some(
                            (s) =>
                              s.name.trim().toLowerCase() === shop.trim().toLowerCase() &&
                              (selectedCompanyId
                                ? s.companyId === selectedCompanyId ||
                                  s.brandId === selectedCompanyId ||
                                  (chosenCompany &&
                                    (s.companyName?.toLowerCase() === chosenCompany.name.toLowerCase() ||
                                      s.brandName?.toLowerCase() === chosenCompany.name.toLowerCase()))
                                : !s.companyId && !s.companyName)
                          );

                          return (
                            <div key={idx} className="py-1.5 px-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-[10px] font-mono text-muted-foreground w-6 text-right shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="font-medium text-foreground truncate">{shop}</span>
                                {isAlreadyMapped && (
                                  <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 rounded shrink-0">
                                    Already Mapped
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                                &rarr; {selectedExecutive}
                                {companies.find((c) => c.id === selectedCompanyId)
                                  ? ` • ${companies.find((c) => c.id === selectedCompanyId)?.name}`
                                  : ""}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="flex items-center justify-between gap-2 py-3 px-4 border-t border-border bg-muted/10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isImporting}
            className="h-8 text-xs font-mono"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={isImporting || isParsing || shopsList.length === 0 || !selectedExecutive}
            className="h-8 text-xs font-medium gap-1.5"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Importing {shopsList.length} Shops...</span>
              </>
            ) : (
              <>
                <span>Import {shopsList.length} Shops</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
