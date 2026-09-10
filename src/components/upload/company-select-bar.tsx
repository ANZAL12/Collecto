"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/lib/hooks/use-queries";
import { Company } from "@/types";
import { CompanyManagerDialog } from "./company-manager-dialog";

interface CompanySelectBarProps {
  selectedCompanyId: string;
  onSelectCompany: (company: Company | null) => void;
  disabled?: boolean;
}

export function CompanySelectBar({
  selectedCompanyId,
  onSelectCompany,
  disabled = false,
}: CompanySelectBarProps) {
  const { data: companies = [], isLoading } = useCompanies();
  const [showManagerDialog, setShowManagerDialog] = React.useState(false);

  // Auto-select first company if none is selected
  React.useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      onSelectCompany(companies[0]);
    }
  }, [companies, selectedCompanyId, onSelectCompany]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      onSelectCompany(null);
      return;
    }
    const found = companies.find((c) => c.id === val);
    onSelectCompany(found || null);
  };

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-xs space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Target Company / Brand</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                Required for Upload
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Invoices will be recorded under this brand for each retail shop.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={selectedCompanyId}
            onChange={handleSelectChange}
            disabled={disabled || isLoading}
            className="h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[180px]"
          >
            {companies.length === 0 ? (
              <option value="">No companies created yet</option>
            ) : (
              companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} {comp.code ? `(${comp.code})` : ""}
                </option>
              ))
            )}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowManagerDialog(true)}
            disabled={disabled}
            className="h-8 text-xs font-semibold gap-1.5 shrink-0 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
            title="Quick add or edit companies"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Quick Add</span>
          </Button>

          <Link
            href="/admin/companies"
            className="inline-flex items-center gap-1 h-8 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Open Dedicated Companies Master Page"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Master Page</span>
          </Link>
        </div>
      </div>

      {selectedCompany ? (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
          <span>Active Upload Target:</span>
          <span className="font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
            {selectedCompany.name} {selectedCompany.code ? `• ${selectedCompany.code}` : ""}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-amber-600 dark:text-amber-400">
          <span>No company selected. Please add or select a company before uploading.</span>
          <button
            type="button"
            onClick={() => setShowManagerDialog(true)}
            className="underline font-medium hover:text-amber-700"
          >
            + Add Company Now
          </button>
        </div>
      )}

      {/* Full Company Manager Dialog */}
      <CompanyManagerDialog
        isOpen={showManagerDialog}
        onClose={() => setShowManagerDialog(false)}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={(company) => onSelectCompany(company)}
      />
    </div>
  );
}
