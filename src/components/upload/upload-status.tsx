import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

import { Pencil, Check, X, AlertTriangle } from "lucide-react";

interface UploadStatusProps {
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  totalAmount?: number;
  companyName?: string;
  onFileNameChange?: (newName: string) => void;
  onToggleWarnings?: () => void;
  isWarningsActive?: boolean;
  className?: string;
}

export function UploadStatus({
  fileName,
  totalRows,
  validRows,
  warningRows,
  errorRows,
  totalAmount = 72500,
  companyName,
  onFileNameChange,
  onToggleWarnings,
  isWarningsActive = false,
  className,
}: UploadStatusProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedName, setEditedName] = React.useState(fileName);

  React.useEffect(() => {
    setEditedName(fileName);
  }, [fileName]);

  const handleSave = () => {
    const clean = editedName.trim();
    if (clean && onFileNameChange) {
      onFileNameChange(clean);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(fileName);
    setIsEditing(false);
  };

  return (
    <Card className={cn("border-border", className)}>
      <CardContent className="p-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  autoFocus
                  className="h-7 px-2 text-xs border border-primary rounded bg-background text-foreground font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className="p-1 text-foreground hover:bg-muted rounded"
                  title="Save name"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1 text-muted-foreground hover:bg-muted rounded"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{fileName}</span>
                {onFileNameChange && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit file name"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            {companyName && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold text-[10px] font-mono">
                {companyName}
              </span>
            )}
            <span className="text-muted-foreground ml-1">
              ({totalRows} rows • {formatCurrency(totalAmount)})
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="border border-border rounded px-1.5 py-0.5 text-foreground">
              {validRows} valid
            </span>
            {warningRows > 0 && (
              <button
                type="button"
                onClick={onToggleWarnings}
                disabled={!onToggleWarnings}
                className={cn(
                  "border rounded px-2 py-0.5 inline-flex items-center gap-1 font-mono text-[11px] transition-all",
                  onToggleWarnings ? "cursor-pointer" : "cursor-default",
                  isWarningsActive
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 font-semibold shadow-2xs ring-1 ring-amber-500/30"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-amber-500/30"
                )}
                title={onToggleWarnings ? (isWarningsActive ? "Showing warnings only. Click to show all rows." : "Click to view warning rows as filtered.") : undefined}
              >
                <AlertTriangle className={cn("h-3 w-3", isWarningsActive ? "text-amber-500 animate-pulse" : "text-amber-500/80")} />
                <span>{warningRows} warnings</span>
              </button>
            )}
            {errorRows > 0 && (
              <span className="border border-border rounded px-1.5 py-0.5 text-foreground font-semibold">
                {errorRows} errors
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
