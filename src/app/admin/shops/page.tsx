"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { ShopTable } from "@/components/shops/shop-table";
import { ShopForm } from "@/components/shops/shop-form";
import { Button } from "@/components/ui/button";
import {
  useShops,
  useAddShopMutation,
  useBulkAddShopsMutation,
  useUpdateShopExecutiveMutation,
  useDeleteShopMutation,
} from "@/lib/hooks/use-queries";
import { Plus, Check, RefreshCw } from "lucide-react";

export default function AdminShopsPage() {
  const { data: shops = [], isLoading, isFetching, refetch } = useShops();
  const addShopMutation = useAddShopMutation();
  const bulkAddMutation = useBulkAddShopsMutation();
  const updateExecutiveMutation = useUpdateShopExecutiveMutation();
  const deleteShopMutation = useDeleteShopMutation();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [deletingShopId, setDeletingShopId] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddSingle = async (data: { name: string; executiveName?: string }) => {
    const res = await addShopMutation.mutateAsync(data);
    if (res.success) {
      showNotice(
        `Added "${data.name}"${data.executiveName ? ` assigned to ${data.executiveName}` : ""}`
      );
    }
    setShowAddForm(false);
  };

  const handleAddBulk = async (data: { names: string[]; executiveName?: string }) => {
    const res = await bulkAddMutation.mutateAsync(data);
    if (res.success) {
      showNotice(
        `Added ${res.count} shops at once${data.executiveName ? ` assigned to ${data.executiveName}` : ""}`
      );
    }
    setShowAddForm(false);
  };

  const handleUpdateExecutive = async (
    shopId: string,
    shopName: string,
    executiveName: string
  ) => {
    await updateExecutiveMutation.mutateAsync({ shopId, shopName, executiveName });
    showNotice(
      executiveName
        ? `Assigned "${shopName}" to ${executiveName}`
        : `Unassigned "${shopName}"`
    );
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete shop "${shopName}"? Its executive mappings will also be removed.`
      )
    ) {
      return;
    }
    setDeletingShopId(shopId);
    try {
      const res = await deleteShopMutation.mutateAsync(shopId);
      if (res.success) {
        showNotice(`Deleted shop "${shopName}"`);
      } else {
        alert(res.error || "Failed to delete shop");
      }
    } finally {
      setDeletingShopId(null);
    }
  };

  const mappedCount = shops.filter((s) => s.assignedExecutiveName).length;
  const unmappedCount = shops.length - mappedCount;

  return (
    <ErpContainer
      title="Shops Master"
      badge="Admin"
      description="Register retail shops and assign them to field executives for automatic collection routing."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs font-mono gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-8 text-xs font-medium gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            {showAddForm ? "Close Form" : "Add Shop(s)"}
          </Button>
        </div>
      }
    >
      {/* Notice notification */}
      {notification && (
        <div className="flex items-center gap-2 p-2 px-3 text-xs bg-muted/60 border border-border rounded text-foreground font-mono">
          <Check className="h-3.5 w-3.5 text-foreground" />
          <span>{notification}</span>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border p-2.5 rounded bg-card">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Shops</div>
          <div className="font-mono text-base font-bold text-foreground mt-0.5">
            {isLoading ? "..." : shops.length}
          </div>
        </div>
        <div className="border border-border p-2.5 rounded bg-card">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Mapped to Executives</div>
          <div className="font-mono text-base font-bold text-foreground mt-0.5">
            {isLoading ? "..." : mappedCount}
          </div>
        </div>
        <div className="border border-border p-2.5 rounded bg-card">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Unmapped</div>
          <div className="font-mono text-base font-bold text-muted-foreground mt-0.5">
            {isLoading ? "..." : unmappedCount}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="flex justify-center mb-2">
          <ShopForm
            onClose={() => setShowAddForm(false)}
            onSubmitSingle={handleAddSingle}
            onSubmitBulk={handleAddBulk}
          />
        </div>
      )}

      <ShopTable
        shops={shops}
        onUpdateExecutive={handleUpdateExecutive}
        onDeleteShop={handleDeleteShop}
        deletingShopId={deletingShopId}
      />
    </ErpContainer>
  );
}
