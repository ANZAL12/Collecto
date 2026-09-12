"use client";

import * as React from "react";
import Link from "next/link";
import { ErpContainer } from "@/components/layout/erp-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCompanies,
  useAddCompanyMutation,
  useDeleteCompanyMutation,
  useShopCollections,
} from "@/lib/hooks/use-queries";
import {
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  UploadCloud,
  Check,
  AlertTriangle,
  X,
  FileText,
  IndianRupee,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Company } from "@/types";

export default function AdminCompaniesPage() {
  const { data: companies = [], isLoading, isFetching, refetch } = useCompanies();
  const { data: collections = [] } = useShopCollections();

  const addCompanyMutation = useAddCompanyMutation();
  const deleteCompanyMutation = useDeleteCompanyMutation();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [isCodeDirty, setIsCodeDirty] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "empty">("all");

  const [notification, setNotification] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingCompany, setDeletingCompany] = React.useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Auto-generate uppercase code as name is typed, unless user manually edited code
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isCodeDirty) {
      setCode(val.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCodeDirty(true);
    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""));
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showNotice("Company or brand name is required", "error");
      return;
    }

    // Check duplicate locally for immediate feedback
    if (companies.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      showNotice(`Company "${cleanName}" already exists.`, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addCompanyMutation.mutateAsync({
        name: cleanName,
        code: code.trim() || undefined,
      });

      if (res.success) {
        showNotice(`Company "${cleanName}" added successfully!`);
        setName("");
        setCode("");
        setIsCodeDirty(false);
        setShowAddForm(false);
      } else {
        showNotice(res.error || "Failed to create company", "error");
      }
    } catch (err: any) {
      showNotice(err.message || "Failed to create company", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany) return;
    setIsDeleting(true);
    try {
      const res = await deleteCompanyMutation.mutateAsync(deletingCompany.id);
      if (res.success) {
        showNotice(`Company "${deletingCompany.name}" deleted.`);
        setDeletingCompany(null);
      } else {
        showNotice(res.error || "Failed to delete company", "error");
      }
    } catch (err: any) {
      showNotice(err.message || "Failed to delete company", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Map company stats (invoices count, total volume)
  const companyStatsMap = React.useMemo(() => {
    const stats: Record<string, { count: number; totalAmount: number }> = {};
    for (const comp of companies) {
      stats[comp.id] = { count: 0, totalAmount: 0 };
    }

    for (const col of collections) {
      let matchedCompId = col.companyId;
      if (!matchedCompId && col.companyName) {
        const found = companies.find(
          (c) => c.name.toLowerCase() === col.companyName?.toLowerCase()
        );
        if (found) matchedCompId = found.id;
      }

      if (matchedCompId && stats[matchedCompId]) {
        stats[matchedCompId].count += 1;
        stats[matchedCompId].totalAmount += col.totalAmount || 0;
      }
    }
    return stats;
  }, [companies, collections]);

  // Summary Metrics
  const activeCompaniesCount = React.useMemo(() => {
    return companies.filter((c) => (companyStatsMap[c.id]?.count || 0) > 0).length;
  }, [companies, companyStatsMap]);

  const totalTrackedBills = React.useMemo(() => {
    return Object.values(companyStatsMap).reduce((acc, curr) => acc + curr.count, 0);
  }, [companyStatsMap]);

  const totalTrackedAmount = React.useMemo(() => {
    return Object.values(companyStatsMap).reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [companyStatsMap]);

  // Filtered companies list
  const filteredCompanies = React.useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()));

      const hasBills = (companyStatsMap[c.id]?.count || 0) > 0;
      if (statusFilter === "active" && !hasBills) return false;
      if (statusFilter === "empty" && hasBills) return false;

      return matchesSearch;
    });
  }, [companies, searchQuery, statusFilter, companyStatsMap]);

  return (
    <ErpContainer
      title="Company & Brand Master"
      badge="Admin"
      description="Manage brand manufacturers (e.g. Haier, General, Voltas, Godrej) to categorize sales registers and track collections by company."
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
            className="h-8 text-xs font-medium gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showAddForm ? "Close Form" : "Add Company"}</span>
          </Button>
        </div>
      }
    >
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-2 p-2.5 px-3.5 text-xs rounded border font-mono animate-in fade-in duration-150 ${notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border p-3 rounded-lg bg-card shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Total Brands</span>
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {isLoading ? "..." : companies.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Registered companies</p>
        </div>

        <div className="border border-border p-3 rounded-lg bg-card shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Active Brands</span>
            <Layers className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {isLoading ? "..." : activeCompaniesCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">With recorded bills</p>
        </div>

        <div className="border border-border p-3 rounded-lg bg-card shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Invoices Tracked</span>
            <FileText className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {isLoading ? "..." : totalTrackedBills}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Across all brands</p>
        </div>

        <div className="border border-border p-3 rounded-lg bg-card shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Total Volume</span>
            <IndianRupee className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="font-mono text-lg font-bold text-foreground truncate">
            {isLoading ? "..." : formatCurrency(totalTrackedAmount)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Brand collection value</p>
        </div>
      </div>

      {/* Add Company Card / Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCompany}
          className="rounded-lg border border-primary/30 bg-card p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">Register New Brand / Company</h3>
                <p className="text-[11px] text-muted-foreground">
                  Bills uploaded to this brand will be grouped for shops and field executives.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowAddForm(false)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Company / Brand Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Haier, General, Voltas, Godrej"
                value={name}
                onChange={handleNameChange}
                required
                className="h-9 text-xs"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                Display name shown in Upload Sale Details and executive cards.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Short Code / Acronym <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                placeholder="e.g. HAIER, GEN, VOLT"
                value={code}
                onChange={handleCodeChange}
                maxLength={10}
                className="h-9 text-xs font-mono uppercase"
              />
              <p className="text-[10px] text-muted-foreground">
                Brief 3-8 character badge tag for invoice badges.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="h-8 text-xs font-medium gap-1.5 min-w-[100px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Creating..." : "Save Company"}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search company by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <span className="text-muted-foreground text-[11px] mr-1">Filter:</span>
          <Button
            type="button"
            variant={statusFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="h-7 px-2 text-xs font-mono"
          >
            All ({companies.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "active" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="h-7 px-2 text-xs font-mono text-emerald-600 dark:text-emerald-400"
          >
            With Bills ({activeCompaniesCount})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "empty" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("empty")}
            className="h-7 px-2 text-xs font-mono text-muted-foreground"
          >
            Unused ({companies.length - activeCompaniesCount})
          </Button>
        </div>
      </div>

      {/* Companies Data Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[35%] text-xs font-semibold">Company / Brand</TableHead>
              <TableHead className="text-xs font-semibold text-center">Short Code</TableHead>
              <TableHead className="text-xs font-semibold text-center">Linked Invoices</TableHead>
              <TableHead className="text-xs font-semibold text-right">Total Outstanding</TableHead>
              <TableHead className="text-xs font-semibold text-center">Registered</TableHead>
              <TableHead className="w-[180px] text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground font-mono">
                  Loading registered companies...
                </TableCell>
              </TableRow>
            ) : filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-36 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8 text-muted-foreground/40 stroke-1" />
                    <p className="text-xs font-medium text-foreground">
                      {searchQuery
                        ? `No companies matching "${searchQuery}"`
                        : "No companies added yet"}
                    </p>
                    <p className="text-[11px] max-w-sm text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search criteria or filter."
                        : "Add your manufacturer brands (like Haier, General, Voltas) to start routing sales registers."}
                    </p>
                    {!searchQuery && (
                      <Button
                        size="sm"
                        onClick={() => setShowAddForm(true)}
                        className="h-7 text-xs mt-1 gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add First Company
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((comp) => {
                const stats = companyStatsMap[comp.id] || { count: 0, totalAmount: 0 };
                return (
                  <TableRow key={comp.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate">
                            {comp.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            ID: {comp.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      {comp.code ? (
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] font-bold bg-primary/5 text-primary border-primary/20 px-2 py-0.5"
                        >
                          {comp.code}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {stats.count > 0 ? (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          {stats.count} bills
                        </Badge>
                      ) : (
                        <span className="text-[11px] font-mono text-muted-foreground">0</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {stats.totalAmount > 0 ? (
                        formatCurrency(stats.totalAmount)
                      ) : (
                        <span className="text-muted-foreground font-normal">₹0</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center text-[11px] text-muted-foreground font-mono">
                      {comp.created_at ? formatDate(comp.created_at) : "Recent"}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/dashboard?companyId=${comp.id}`}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors"
                          title={`Upload collections for ${comp.name}`}
                        >
                          <UploadCloud className="h-3 w-3 text-sky-500" />
                          <span className="hidden sm:inline">Upload</span>
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCompany(comp)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title={`Delete ${comp.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Delete Company &ldquo;{deletingCompany.name}&rdquo;?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to remove this brand from your master list?
                </p>
              </div>
            </div>

            {/* Warning about existing invoices */}
            {companyStatsMap[deletingCompany.id]?.count > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Existing Invoices Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This brand currently has{" "}
                  <strong>{companyStatsMap[deletingCompany.id].count} recorded bills</strong>{" "}
                  worth{" "}
                  <strong>{formatCurrency(companyStatsMap[deletingCompany.id].totalAmount)}</strong>.
                  Deleting this brand entry will unlink the brand tag from future uploads.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                No invoices are currently linked to this brand. Deleting it is safe and immediate.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingCompany(null)}
                disabled={isDeleting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-8 text-xs font-medium gap-1.5 min-w-[120px]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </ErpContainer>
  );
}
