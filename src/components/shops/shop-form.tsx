"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useExecutives } from "@/lib/hooks/use-queries";
import { X, Plus, Layers } from "lucide-react";

interface ShopFormProps {
  onClose?: () => void;
  onSubmitSingle?: (data: { name: string; executiveName?: string }) => void;
  onSubmitBulk?: (data: { names: string[]; executiveName?: string }) => void;
}

export function ShopForm({ onClose, onSubmitSingle, onSubmitBulk }: ShopFormProps) {
  const [mode, setMode] = React.useState<"single" | "bulk">("single");
  const [name, setName] = React.useState("");
  const [bulkText, setBulkText] = React.useState("");
  const [selectedExec, setSelectedExec] = React.useState<string>("");
  const { data: executives = [] } = useExecutives();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "single") {
      if (!name.trim()) return;
      if (onSubmitSingle) {
        onSubmitSingle({
          name: name.trim(),
          executiveName: selectedExec || undefined,
        });
      }
    } else {
      const names = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (names.length === 0) return;

      if (onSubmitBulk) {
        onSubmitBulk({
          names,
          executiveName: selectedExec || undefined,
        });
      }
    }

    if (onClose) {
      onClose();
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2.5 pt-3 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider">
            Add Retail Shops
          </CardTitle>
          <div className="flex items-center rounded border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`px-2 py-0.5 text-[11px] font-mono rounded-xs transition-colors ${
                mode === "single" ? "bg-background text-foreground font-semibold shadow-xs" : "text-muted-foreground"
              }`}
            >
              Single Shop
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={`px-2 py-0.5 text-[11px] font-mono rounded-xs transition-colors ${
                mode === "bulk" ? "bg-background text-foreground font-semibold shadow-xs" : "text-muted-foreground"
              }`}
            >
              Bulk at Once
            </button>
          </div>
        </div>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 px-4 py-3">
          {mode === "single" ? (
            <div className="space-y-1">
              <Label htmlFor="shop-name" className="text-xs">Shop Name</Label>
              <Input
                id="shop-name"
                placeholder="e.g. MEPARAMBATH TRADERS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs h-8"
                required
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="bulk-names" className="text-xs">
                Shop Names (One per line)
              </Label>
              <Textarea
                id="bulk-names"
                placeholder={`MEPARAMBATH TRADERS\nUNITED BUSINESS CORPORATION (UBC)\nMALABAR ENTERPRISES\nABC TRADERS`}
                value={bulkText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkText(e.target.value)}
                className="text-xs font-mono min-h-[110px] resize-none"
                required
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Paste all shop names at once. Each line will create a registered shop.
              </p>
            </div>
          )}

          {/* Assign Executive */}
          <div className="space-y-1">
            <Label htmlFor="exec-select" className="text-xs">
              Assign Executive {mode === "bulk" ? "(For All Added Shops)" : ""}
            </Label>
            <select
              id="exec-select"
              value={selectedExec}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedExec(e.target.value)}
              className="w-full h-8 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900"
            >
              <option value="">-- Assign Later (Unmapped) --</option>
              {executives.map((exec) => (
                <option key={exec.id} value={exec.name}>
                  {exec.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 px-4 pb-3 pt-0 border-t border-border pt-2.5">
          {onClose && (
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" className="h-7 text-xs font-medium gap-1">
            {mode === "single" ? (
              <>
                <Plus className="h-3 w-3" />
                Add & Map Shop
              </>
            ) : (
              <>
                <Layers className="h-3 w-3" />
                Add All at Once
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
