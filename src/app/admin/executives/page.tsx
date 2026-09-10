"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { ExecutiveTable } from "@/components/executives/executive-table";
import { ExecutiveForm } from "@/components/executives/executive-form";
import { Button } from "@/components/ui/button";
import {
  useExecutives,
  useShops,
  useShopMappings,
  useShopCollections,
  useCompanies,
  useAddExecutiveMutation,
  useUpdateExecutiveCredentialsMutation,
  useDeleteExecutiveMutation,
} from "@/lib/hooks/use-queries";
import { Plus, RefreshCw, Building2 } from "lucide-react";
import { Executive } from "@/types";
import { buildExecutiveCompaniesMap } from "@/lib/executive-utils";

export default function AdminExecutivesPage() {
  const { data: executives = [], isFetching, refetch } = useExecutives();
  const { data: shops = [] } = useShops();
  const { data: mappings = [] } = useShopMappings();
  const { data: collections = [] } = useShopCollections();
  const { data: companies = [] } = useCompanies();

  const addExecutiveMutation = useAddExecutiveMutation();
  const updateCredsMutation = useUpdateExecutiveCredentialsMutation();
  const deleteExecutiveMutation = useDeleteExecutiveMutation();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingExecutive, setEditingExecutive] = React.useState<Executive | null>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = React.useState<string>("all");

  const companiesMap = React.useMemo(() => {
    return buildExecutiveCompaniesMap(executives, {
      shops,
      mappings,
      collections,
    });
  }, [executives, shops, mappings, collections]);

  const filteredExecutives = React.useMemo(() => {
    if (!selectedCompanyFilter || selectedCompanyFilter === "all") {
      return executives;
    }
    const targetComp = selectedCompanyFilter.toLowerCase();
    return executives.filter((exec) => {
      const execCompanies = companiesMap.get(exec.name.trim().toLowerCase()) || [];
      return execCompanies.some((c) => c.toLowerCase() === targetComp);
    });
  }, [executives, selectedCompanyFilter, companiesMap]);

  const handleAddExecutive = async (data: { name: string; username: string; password: string }) => {
    await addExecutiveMutation.mutateAsync(data);
    setShowAddForm(false);
  };

  const handleUpdateCredentials = async (data: { name: string; username: string; password: string; oldPassword?: string }) => {
    await updateCredsMutation.mutateAsync({
      name: data.name,
      username: data.username,
      password: data.password,
      oldPassword: data.oldPassword,
    });
    setEditingExecutive(null);
  };

  const handleDeleteExecutive = async (exec: Executive) => {
    await deleteExecutiveMutation.mutateAsync({ id: exec.id, name: exec.name });
  };

  return (
    <ErpContainer
      title="Executives"
      badge="Admin"
      description="Field executive accounts with login credentials given from admin side."
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company Filter */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-0.5 shadow-2xs">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="h-7 text-xs bg-transparent border-0 font-medium text-foreground focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Companies ({executives.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
              setEditingExecutive(null);
              setShowAddForm(!showAddForm);
            }}
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

      {editingExecutive && (
        <div className="flex justify-center mb-3">
          <ExecutiveForm
            initialData={{
              name: editingExecutive.name,
              username: editingExecutive.username,
              password: editingExecutive.password,
            }}
            onClose={() => setEditingExecutive(null)}
            onSubmit={handleUpdateCredentials}
          />
        </div>
      )}

      <ExecutiveTable
        executives={filteredExecutives}
        companiesMap={companiesMap}
        onEditCredentials={(exec) => {
          setShowAddForm(false);
          setEditingExecutive(exec);
        }}
        onDeleteExecutive={handleDeleteExecutive}
      />
    </ErpContainer>
  );
}
