"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { UnmappedShopsTable } from "@/components/mappings/unmapped-shops-table";
import { MappingForm } from "@/components/mappings/mapping-form";
import { Button } from "@/components/ui/button";
import { useShopMappings } from "@/lib/hooks/use-queries";
import { GitFork, RefreshCw, Plus } from "lucide-react";

export default function AdminMappingsPage() {
  const { data: mappings = [], isLoading, isFetching, refetch } = useShopMappings();
  const [showMappingForm, setShowMappingForm] = React.useState(false);
  const [activeAssignShopId, setActiveAssignShopId] = React.useState<string | undefined>(undefined);

  const handleOpenAssign = (shopId: string) => {
    setActiveAssignShopId(shopId);
    setShowMappingForm(true);
  };

  const handleSuccess = async () => {
    await refetch();
    setShowMappingForm(false);
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
            onClick={() => {
              setActiveAssignShopId(undefined);
              setShowMappingForm(!showMappingForm);
            }}
            className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {showMappingForm ? "Close Form" : "Assign / Add Shop"}
          </Button>
        </div>
      }
    >
      {showMappingForm && (
        <div className="flex justify-center mb-4">
          <MappingForm
            initialShopId={activeAssignShopId}
            onCancel={() => setShowMappingForm(false)}
            onSuccess={handleSuccess}
          />
        </div>
      )}

      <UnmappedShopsTable
        mappings={mappings}
        onAssign={handleOpenAssign}
      />
    </ErpContainer>
  );
}
