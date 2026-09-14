"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";
import { useCompanies } from "@/lib/hooks/use-queries";
import { Company } from "@/types";

interface CompanySelectBarProps {
  selectedCompanyId: string;
  onSelectCompany: (company: Company | null) => void;
  disabled?: boolean;
  allowAll?: boolean;
  label?: string;
  description?: string;
}

export function CompanySelectBar({
  selectedCompanyId,
  onSelectCompany,
  disabled = false,
  allowAll = false,
  label = "Target Company / Brand",
  description = "Invoices will be recorded under this brand for each retail shop.",
}: CompanySelectBarProps) {
  const { data: companies = [], isLoading } = useCompanies();

  const onSelectRef = React.useRef(onSelectCompany);
  onSelectRef.current = onSelectCompany;

  // Auto-select first company or ALL if none is selected
  React.useEffect(() => {
    if (!selectedCompanyId || (!allowAll && selectedCompanyId === "ALL")) {
      if (allowAll) {
        onSelectRef.current({
          id: "ALL",
          name: "All Companies",
          code: "ALL",
        });
      } else if (companies.length > 0) {
        const defaultComp =
          companies.find((c) => {
            const n = c.name?.toLowerCase() || "";
            return n.includes("haier") || n.includes("heir");
          }) || companies[0];
        onSelectRef.current(defaultComp);
      }
    }
  }, [companies, selectedCompanyId, allowAll]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "ALL") {
      onSelectCompany({
        id: "ALL",
        name: "All Companies",
        code: "ALL",
      });
      return;
    }
    if (!val) {
      onSelectCompany(null);
      return;
    }
    const found = companies.find((c) => c.id === val);
    onSelectCompany(found || null);
  };

  const selectedCompany =
    selectedCompanyId === "ALL"
      ? { id: "ALL", name: "All Companies", code: "ALL" }
      : companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-xs space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">{label}</span>
              {allowAll ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                  Voucher Type Auto-Match
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                  Required for Upload
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={selectedCompanyId}
            onChange={handleSelectChange}
            disabled={disabled || isLoading}
            className="h-8 rounded-md border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-w-[220px]"
          >
            {allowAll && (
              <option value="ALL">
                All Companies (Auto-match from Voucher Type)
              </option>
            )}
            {companies.length === 0 && !allowAll ? (
              <option value="">No companies created yet</option>
            ) : (
              companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} {comp.code ? `(${comp.code})` : ""}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {selectedCompany ? (
        <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
          <span>Active Upload Target:</span>
          <span className="font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
            {selectedCompany.name} {selectedCompany.code && selectedCompany.code !== "ALL" ? `• ${selectedCompany.code}` : ""}
          </span>
          {allowAll && selectedCompanyId !== "ALL" && (
            <span className="text-primary text-[10px] font-medium">
              (Filtered: only invoices for {selectedCompany.name} will be parsed)
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-amber-600 dark:text-amber-400">
          <span>No company selected. Please select a company before uploading.</span>
          <Link
            href={`${typeof window !== "undefined" && window.location.pathname.startsWith("/global") ? "/global" : "/admin"}/companies`}
            className="underline font-medium hover:text-amber-700"
          >
            Go to Companies
          </Link>
        </div>
      )}
    </div>
  );
}
