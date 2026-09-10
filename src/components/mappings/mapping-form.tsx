"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import {
  useShops,
  useExecutives,
  useUpdateShopExecutiveMutation,
  useAddShopMutation,
} from "@/lib/hooks/use-queries";
import { Store, Plus, FileSpreadsheet } from "lucide-react";

interface MappingFormProps {
  initialShopId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onOpenExcelImport?: () => void;
}

export function MappingForm({ initialShopId, onSuccess, onCancel, onOpenExcelImport }: MappingFormProps) {
  const { data: shops = [] } = useShops();
  const { data: executives = [] } = useExecutives();
  const updateExecutiveMutation = useUpdateShopExecutiveMutation();
  const addShopMutation = useAddShopMutation();

  // Mode: "select" (from existing shops) or "manual" (type new shop name)
  const [isManualMode, setIsManualMode] = React.useState(false);
  const [manualShopName, setManualShopName] = React.useState("");
  const [selectedShopId, setSelectedShopId] = React.useState(initialShopId || "");
  const [selectedExecutiveName, setSelectedExecutiveName] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  React.useEffect(() => {
    if (initialShopId) {
      setIsManualMode(false);
      setSelectedShopId(initialShopId);
      const match = shops.find((item) => item.id === initialShopId);
      if (match?.assignedExecutiveName) {
        setSelectedExecutiveName(match.assignedExecutiveName);
      }
    } else if (shops.length > 0 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
      if (shops[0].assignedExecutiveName) {
        setSelectedExecutiveName(shops[0].assignedExecutiveName);
      }
    }
  }, [initialShopId, shops, selectedShopId]);

  const isPending = updateExecutiveMutation.isPending || addShopMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (isManualMode) {
      const cleanName = manualShopName.trim();
      if (!cleanName) {
        setErrorMessage("Please enter a shop name.");
        return;
      }

      try {
        const res = await addShopMutation.mutateAsync({
          name: cleanName,
          executiveName: selectedExecutiveName || undefined,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to create shop");
          return;
        }

        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setManualShopName("");
          if (onSuccess) onSuccess();
        }, 400);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to create shop");
      }
    } else {
      if (!selectedShopId) {
        setErrorMessage("Please select a shop.");
        return;
      }

      const shop = shops.find((s) => s.id === selectedShopId);
      if (shop) {
        await updateExecutiveMutation.mutateAsync({
          shopId: shop.id,
          shopName: shop.name,
          executiveName: selectedExecutiveName,
        });
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        if (onSuccess) onSuccess();
      }, 400);
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-sm">
      <CardHeader className="py-2.5 px-4 border-b border-border">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isManualMode ? "Add New Shop & Assign Executive" : "Assign Shop to Executive"}
        </CardTitle>
      </CardHeader>

      {/* Segmented Mode Selector */}
      <div className={`grid ${onOpenExcelImport ? "grid-cols-3" : "grid-cols-2"} p-1 gap-1 bg-muted/25 border-b border-border text-xs`}>
        <button
          type="button"
          onClick={() => {
            setIsManualMode(false);
            setErrorMessage("");
          }}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-1.5 rounded font-medium text-[11px] transition-all ${
            !isManualMode
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Store className="h-3 w-3" />
          Existing Shop
        </button>
        <button
          type="button"
          onClick={() => {
            setIsManualMode(true);
            setErrorMessage("");
          }}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-1.5 rounded font-medium text-[11px] transition-all ${
            isManualMode
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="h-3 w-3" />
          Manual Add
        </button>
        {onOpenExcelImport && (
          <button
            type="button"
            onClick={onOpenExcelImport}
            className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 rounded font-medium text-[11px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all"
            title="Import list of shops from Excel spreadsheet"
          >
            <FileSpreadsheet className="h-3 w-3" />
            From Excel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3.5 p-4">
          {errorMessage && (
            <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {errorMessage}
            </div>
          )}

          {isManualMode ? (
            /* Manual Shop Name Input */
            <div className="space-y-1.5">
              <Label htmlFor="manual-shop-name" className="text-xs">
                New Shop Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="manual-shop-name"
                type="text"
                value={manualShopName}
                onChange={(e) => {
                  setManualShopName(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="e.g. Royal Supermarket, Calicut"
                autoFocus
                required
                className="h-8 text-xs font-medium"
              />
              <p className="text-[11px] text-muted-foreground">
                This shop will be added to the registered master and paired with the executive below.
              </p>
            </div>
          ) : (
            /* Select Existing Shop Dropdown */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="shop-select" className="text-xs">
                  Select Registered Shop <span className="text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {shops.length} {shops.length === 1 ? "shop" : "shops"}
                </span>
              </div>
              <select
                id="shop-select"
                value={selectedShopId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedShopId(sId);
                  const s = shops.find((item) => item.id === sId);
                  if (s?.assignedExecutiveName) {
                    setSelectedExecutiveName(s.assignedExecutiveName);
                  } else {
                    setSelectedExecutiveName("");
                  }
                }}
                className="h-8 w-full rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900"
                required
              >
                {shops.length === 0 ? (
                  <option value="">No shops available</option>
                ) : (
                  shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.assignedExecutiveName ? `(${s.assignedExecutiveName})` : "(Unassigned)"}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Executive Member Assignment */}
          <div className="space-y-1.5">
            <Label htmlFor="exec-select" className="text-xs">
              Assign to Executive Member
            </Label>
            <select
              id="exec-select"
              value={selectedExecutiveName}
              onChange={(e) => setSelectedExecutiveName(e.target.value)}
              className="h-8 w-full rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none dark:bg-zinc-900"
            >
              <option value="">-- Unassigned --</option>
              {executives.map((exec) => (
                <option key={exec.id} value={exec.name}>
                  {exec.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              All collections and Excel invoice items for this shop will be routed to this executive.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 px-4 pb-4 pt-0">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="h-7 text-xs font-medium"
          >
            {saved
              ? "Saved!"
              : isPending
              ? "Saving..."
              : isManualMode
              ? "Create & Assign Shop"
              : "Save Mapping"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
