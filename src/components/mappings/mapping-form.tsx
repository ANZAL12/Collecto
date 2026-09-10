"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useShops, useExecutives, useUpdateShopExecutiveMutation } from "@/lib/hooks/use-queries";

interface MappingFormProps {
  initialShopId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MappingForm({ initialShopId, onSuccess, onCancel }: MappingFormProps) {
  const { data: shops = [] } = useShops();
  const { data: executives = [] } = useExecutives();
  const updateExecutiveMutation = useUpdateShopExecutiveMutation();

  const [selectedShopId, setSelectedShopId] = React.useState(initialShopId || "");
  const [selectedExecutiveName, setSelectedExecutiveName] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (initialShopId) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) return;

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
  };

  return (
    <Card className="w-full max-w-md border-border bg-card">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider">
          Assign Shop to Executive
        </CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="shop-select">Shop Name</Label>
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
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="exec-select">Executive Member Name</Label>
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
            disabled={updateExecutiveMutation.isPending}
            className="h-7 text-xs font-medium"
          >
            {saved
              ? "Saved"
              : updateExecutiveMutation.isPending
              ? "Saving..."
              : "Save Mapping"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
