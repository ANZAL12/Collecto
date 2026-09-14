"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { ShopTable } from "@/components/shops/shop-table";
import { ShopForm } from "@/components/shops/shop-form";
import { Shop } from "@/types";
import { Button } from "@/components/ui/button";
import {
  useShops,
  useAddShopMutation,
  useBulkAddShopsMutation,
  useUpdateShopExecutiveMutation,
  useDeleteShopMutation,
  useDeleteShopsByIdsMutation,
} from "@/lib/hooks/use-queries";
import { Plus, Check, RefreshCw, FileSpreadsheet } from "lucide-react";
import { ExcelShopImportDialog } from "@/components/mappings/excel-shop-import-dialog";

export default function AdminShopsPage() {
  const { data: shops = [], isLoading, isFetching, refetch } = useShops();
  const addShopMutation = useAddShopMutation();
  const bulkAddMutation = useBulkAddShopsMutation();
  const updateExecutiveMutation = useUpdateShopExecutiveMutation();
  const deleteShopMutation = useDeleteShopMutation();
  const deleteShopsByIdsMutation = useDeleteShopsByIdsMutation();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [showExcelImport, setShowExcelImport] = React.useState(false);
  const [deletingShopId, setDeletingShopId] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "MAPPED" | "UNMAPPED">("ALL");

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

  const handleDeleteShop = async (target: Shop | string, legacyShopName?: string) => {
    const shop: Shop =
      typeof target === "string"
        ? { id: target, name: legacyShopName || "" }
        : target;

    const brandLabel = shop.companyName || shop.brandName ? ` [${shop.companyName || shop.brandName}]` : "";
    if (
      !window.confirm(
        `Are you sure you want to delete "${shop.name}"${brandLabel}?`
      )
    ) {
      return;
    }

    const itemKey = `${shop.id}_${shop.mappingId || shop.companyName || ""}`;
    setDeletingShopId(itemKey);
    try {
      const res = await deleteShopMutation.mutateAsync({
        shopId: shop.id,
        companyName: shop.companyName || shop.brandName,
        mappingId: shop.mappingId,
      });
      if (res.success) {
        showNotice(`Deleted "${shop.name}"${brandLabel}`);
      } else {
        alert(res.error || "Failed to delete shop");
      }
    } finally {
      setDeletingShopId(null);
    }
  };

  const handleDeleteFilteredShops = async (shopsToDelete: Shop[]) => {
    if (shopsToDelete.length === 0) return;
    const res = await deleteShopsByIdsMutation.mutateAsync(shopsToDelete);
    if (res.success) {
      showNotice(`Successfully deleted ${res.count} ${res.count === 1 ? "shop" : "shops"}.`);
    } else {
      alert(res.error || "Failed to delete shops");
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
            onClick={() => setShowExcelImport(true)}
            className="h-8 text-xs font-semibold gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import from Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
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

      {/* Summary stats with one-click quick filtering */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`p-2.5 rounded text-left transition-all border cursor-pointer ${
            statusFilter === "ALL"
              ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-2xs"
              : "border-border bg-card hover:bg-muted/40"
          }`}
          title="Filter all shops"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Shops</div>
          <div className="font-mono text-base font-bold text-foreground mt-0.5">
            {isLoading ? "..." : shops.length}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("MAPPED")}
          className={`p-2.5 rounded text-left transition-all border cursor-pointer ${
            statusFilter === "MAPPED"
              ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-2xs"
              : "border-border bg-card hover:bg-muted/40"
          }`}
          title="Filter mapped shops"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Mapped to Executives</div>
          <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {isLoading ? "..." : mappedCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("UNMAPPED")}
          className={`p-2.5 rounded text-left transition-all border cursor-pointer ${
            statusFilter === "UNMAPPED"
              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 shadow-2xs"
              : "border-border bg-card hover:bg-muted/40"
          }`}
          title="Filter unmapped shops"
        >
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Unmapped</div>
          <div className="font-mono text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {isLoading ? "..." : unmappedCount}
          </div>
        </button>
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
        onDeleteFilteredShops={handleDeleteFilteredShops}
        deletingShopId={deletingShopId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <ExcelShopImportDialog
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onSuccess={(count, exec) => {
          showNotice(`Successfully imported and mapped ${count} ${count === 1 ? "shop" : "shops"} to ${exec}!`);
          refetch();
        }}
      />
    </ErpContainer>
  );
}
