"use client";

import * as React from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ExcelDropzoneProps {
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  selectedFile?: File | null;
  className?: string;
}

export function ExcelDropzone({
  onFileSelected,
  isProcessing = false,
  selectedFile,
  className,
}: ExcelDropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded border border-dashed border-border p-6 text-center cursor-pointer transition-colors",
        isDragOver ? "border-foreground bg-muted/40" : "hover:border-foreground/50",
        className
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="flex flex-col items-center max-w-sm space-y-2">
        <div className="text-muted-foreground">
          {selectedFile ? (
            <FileSpreadsheet className="h-6 w-6 text-foreground" />
          ) : (
            <UploadCloud className="h-6 w-6" />
          )}
        </div>

        {selectedFile ? (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">
              Drag & drop collection sheet (.xlsx, .xls, .csv)
            </p>
            <p className="text-[11px] text-muted-foreground">
              Click to browse your computer
            </p>
          </div>
        )}

        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="h-7 text-xs px-2.5"
          >
            {isProcessing ? "Processing..." : selectedFile ? "Change File" : "Choose File"}
          </Button>
        </div>
      </div>
    </div>
  );
}
