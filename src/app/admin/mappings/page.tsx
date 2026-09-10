"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { UnmappedShopsTable } from "@/components/mappings/unmapped-shops-table";
import { MappingForm } from "@/components/mappings/mapping-form";
import { ExcelShopImportDialog } from "@/components/mappings/excel-shop-import-dialog";
import { Button } from "@/components/ui/button";
import {
  useShopMappings,
  useDeleteShopMutation,
  useDeleteAllShopsMutation,
} from "@/lib/hooks/use-queries";
import { RefreshCw, Plus, FileSpreadsheet, CheckCircle2, X } from "lucide-react";

export default function AdminMappingsPage() {
  const { data: mappings = [], isLoading, isFetching, refetch } = useShopMappings();
  const deleteShopMutation = useDeleteShopMutation();
  const deleteAllShopsMutation = useDeleteAllShopsMutation();

  const [showMappingForm, setShowMappingForm] = React.useState(false);
  const [showExcelImport, setShowExcelImport] = React.useState(false);
  const [activeAssignShopId, setActiveAssignShopId] = React.useState<string | undefined>(undefined);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleOpenAssign = (shopId: string) => {
    setActiveAssignShopId(shopId);
    setShowMappingForm(true);
  };

  const handleSuccess = async () => {
    await refetch();
    setShowMappingForm(false);
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    try {
      const res = await deleteShopMutation.mutateAsync(shopId);
      if (res?.success) {
        setNotice(`Successfully deleted shop "${shopName}" and removed mapping.`);
        setTimeout(() => setNotice(null), 6000);
      } else {
        alert(res?.error || "Failed to delete shop.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete shop.");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await deleteAllShopsMutation.mutateAsync();
      if (res?.success) {
        setNotice("Successfully deleted all shops and mappings.");
        setTimeout(() => setNotice(null), 6000);
      } else {
        alert(res?.error || "Failed to delete all shops.");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete all shops.");
    }
  };

  return (
    <ErpContainer
      title="Shop ↔ Executive Mappings"
      badge="Critical Module"
      description="Predefined master mapping rules. During Excel uploads, the system uses these mappings to automatically identify and assign collections to field executives."
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
            onClick={() => {
              setActiveAssignShopId(undefined);
              setShowMappingForm(!showMappingForm);
            }}
            className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {showMappingForm ? "Close Form" : "Manual Shop"}
          </Button>
        </div>
      }
    >
      {notice && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-0.5 hover:text-emerald-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {showMappingForm && (
        <div className="flex justify-center mb-4">
          <MappingForm
            initialShopId={activeAssignShopId}
            onCancel={() => setShowMappingForm(false)}
            onSuccess={handleSuccess}
            onOpenExcelImport={() => {
              setShowMappingForm(false);
              setShowExcelImport(true);
            }}
          />
        </div>
      )}

      <UnmappedShopsTable
        mappings={mappings}
        onAssign={handleOpenAssign}
        onDeleteShop={handleDeleteShop}
        onDeleteAll={handleDeleteAll}
      />

      <ExcelShopImportDialog
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onSuccess={async (count, exec) => {
          setNotice(`Successfully imported and mapped ${count} ${count === 1 ? "shop" : "shops"} to ${exec}!`);
          await refetch();
          setTimeout(() => setNotice(null), 8000);
        }}
      />
    </ErpContainer>
  );
}
