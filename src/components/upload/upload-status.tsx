import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

import { Pencil, Check, X } from "lucide-react";

interface UploadStatusProps {
  fileName: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  totalAmount?: number;
  onFileNameChange?: (newName: string) => void;
  className?: string;
}

export function UploadStatus({
  fileName,
  totalRows,
  validRows,
  warningRows,
  errorRows,
  totalAmount = 72500,
  onFileNameChange,
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
            <span className="text-muted-foreground ml-1">
              ({totalRows} rows • {formatCurrency(totalAmount)})
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="border border-border rounded px-1.5 py-0.5 text-foreground">
              {validRows} valid
            </span>
            {warningRows > 0 && (
              <span className="border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                {warningRows} warnings
              </span>
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
