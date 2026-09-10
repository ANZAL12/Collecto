"use client";

import * as React from "react";
import {
  Building2,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  X,
  Store,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useCompanies,
  useAddCompanyMutation,
  useDeleteCompanyMutation,
} from "@/lib/hooks/use-queries";
import { Company } from "@/types";

interface CompanyManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany?: (company: Company) => void;
  selectedCompanyId?: string;
}

export function CompanyManagerDialog({
  isOpen,
  onClose,
  onSelectCompany,
  selectedCompanyId,
}: CompanyManagerDialogProps) {
  const { data: companies = [], isLoading, refetch } = useCompanies();
  const addCompanyMutation = useAddCompanyMutation();
  const deleteCompanyMutation = useDeleteCompanyMutation();

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Company or brand name is required.");
      return;
    }

    setError(null);
    try {
      const res = await addCompanyMutation.mutateAsync({
        name: cleanName,
        code: code.trim() || cleanName.toUpperCase().slice(0, 10),
      });

      if (res.success && res.data) {
        setSuccessNotice(`Added "${res.data.name}" successfully!`);
        setName("");
        setCode("");
        if (onSelectCompany) {
          onSelectCompany(res.data);
        }
        setTimeout(() => setSuccessNotice(null), 4000);
      } else {
        setError(res.error || "Failed to add company.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to add company.");
    }
  };

  const handleDelete = async (company: Company) => {
    if (!window.confirm(`Are you sure you want to delete brand "${company.name}"?`)) {
      return;
    }

    setDeletingId(company.id);
    try {
      const res = await deleteCompanyMutation.mutateAsync(company.id);
      if (!res.success) {
        setError(res.error || "Failed to delete company.");
      } else {
        setSuccessNotice(`Deleted "${company.name}".`);
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete company.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <Card className="w-full max-w-lg border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Manage Companies & Brands</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Manually register distributor companies and product brands.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Add Form */}
          <form onSubmit={handleAdd} className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span>Add New Company / Brand</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                Manual Entry
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="man-comp-name" className="text-[11px] font-medium">
                  Company / Brand Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="man-comp-name"
                  type="text"
                  placeholder="e.g. Haier, General, Godrej"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs bg-background"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="man-comp-code" className="text-[11px] font-medium">
                  Short Code <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="man-comp-code"
                  type="text"
                  placeholder="e.g. HAIER, GEN"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-8 text-xs font-mono uppercase bg-background"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={addCompanyMutation.isPending || !name.trim()}
                className="h-7 text-xs font-medium gap-1.5"
              >
                {addCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3" />
                    <span>Add Brand</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* List of Existing Companies */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Registered Brands ({companies.length})
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Active in System
              </span>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border/50 max-h-56 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading companies...</span>
                </div>
              ) : companies.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground italic">
                  No companies added yet. Add your first brand above!
                </div>
              ) : (
                companies.map((company) => {
                  const isSelected = company.id === selectedCompanyId;
                  return (
                    <div
                      key={company.id}
                      className={`p-2.5 flex items-center justify-between gap-2 transition-colors ${
                        isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded bg-muted text-muted-foreground shrink-0">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {company.name}
                            </span>
                            {company.code && (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono uppercase px-1 py-0"
                              >
                                {company.code}
                              </Badge>
                            )}
                            {isSelected && (
                              <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded font-semibold">
                                Active Target
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onSelectCompany && (
                          <Button
                            type="button"
                            variant={isSelected ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                              onSelectCompany(company);
                              onClose();
                            }}
                            className="h-6 px-2 text-[11px] font-mono"
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company)}
                          disabled={deletingId === company.id}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title={`Delete ${company.name}`}
                        >
                          {deletingId === company.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
