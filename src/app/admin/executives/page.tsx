"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { ExecutiveTable } from "@/components/executives/executive-table";
import { ExecutiveForm } from "@/components/executives/executive-form";
import { Button } from "@/components/ui/button";
import { useExecutives, useAddExecutiveMutation } from "@/lib/hooks/use-queries";
import { Plus, RefreshCw } from "lucide-react";

export default function AdminExecutivesPage() {
  const { data: executives = [], isLoading, isFetching, refetch } = useExecutives();
  const addExecutiveMutation = useAddExecutiveMutation();
  const [showAddForm, setShowAddForm] = React.useState(false);

  const handleAddExecutive = async (data: { name: string }) => {
    await addExecutiveMutation.mutateAsync(data.name);
    setShowAddForm(false);
  };

  return (
    <ErpContainer
      title="Executives"
      badge="Admin"
      description="Executive members who receive mapped shop collections."
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
            className="h-8 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {showAddForm ? "Close Form" : "Add Executive"}
          </Button>
        </div>
      }
    >
      {showAddForm && (
        <div className="flex justify-center mb-3">
          <ExecutiveForm
            onClose={() => setShowAddForm(false)}
            onSubmit={handleAddExecutive}
          />
        </div>
      )}

      <ExecutiveTable executives={executives} />
    </ErpContainer>
  );
}
