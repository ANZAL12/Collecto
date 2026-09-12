"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { X, Lock, User, AlertCircle, Loader2, Building2, Plus, Check } from "lucide-react";
import { useCompanies } from "@/lib/hooks/use-queries";
import { cn } from "@/lib/utils";

const DEFAULT_KNOWN_COMPANIES = ["Haier", "General", "Carrier", "Rockwell", "Formenty", "Philips"];

interface ExecutiveFormProps {
  onClose?: () => void;
  onSubmit?: (data: {
    name: string;
    username: string;
    password: string;
    oldPassword?: string;
    companies?: string[];
  }) => Promise<void> | void;
  initialData?: {
    name: string;
    username?: string;
    password?: string;
    companies?: string[];
  };
}

export function ExecutiveForm({ onClose, onSubmit, initialData }: ExecutiveFormProps) {
  const { data: dbCompanies = [] } = useCompanies();

  const [name, setName] = React.useState(initialData?.name || "");
  const [username, setUsername] = React.useState(initialData?.username || "");
  const [password, setPassword] = React.useState(initialData?.password || "password123");
  const [selectedCompanies, setSelectedCompanies] = React.useState<string[]>(
    initialData?.companies || []
  );
  const [extraCompanies, setExtraCompanies] = React.useState<string[]>([]);
  const [customBrandInput, setCustomBrandInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [userEditedUsername, setUserEditedUsername] = React.useState(Boolean(initialData?.username));

  // Combine DB companies + defaults + user-added custom brands
  const allAvailableCompanies = React.useMemo(() => {
    const list: { id: string; name: string; code?: string }[] = [];
    const seen = new Set<string>();

    // 1. From database
    for (const c of dbCompanies) {
      const lower = c.name.trim().toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ id: c.id, name: c.name.trim(), code: c.code });
      }
    }

    // 2. From default known brands
    for (const d of DEFAULT_KNOWN_COMPANIES) {
      const lower = d.trim().toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ id: `def-${lower}`, name: d, code: d.toUpperCase().slice(0, 8) });
      }
    }

    // 3. From initial data companies
    if (initialData?.companies) {
      for (const ic of initialData.companies) {
        const lower = ic.trim().toLowerCase();
        if (lower && !seen.has(lower)) {
          seen.add(lower);
          list.push({ id: `init-${lower}`, name: ic.trim() });
        }
      }
    }

    // 4. From manually added extra companies
    for (const ec of extraCompanies) {
      const lower = ec.trim().toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        list.push({ id: `extra-${lower}`, name: ec.trim() });
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCompanies, extraCompanies, initialData?.companies]);

  // Auto-generate username from name if not manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!userEditedUsername) {
      const generated = val
        .toLowerCase()
        .trim()
        .split(/\s+/)[0]
        .replace(/[^a-z0-9]/g, "");
      setUsername(generated);
    }
  };

  const isCompanySelected = (companyName: string) => {
    const target = companyName.trim().toLowerCase();
    return selectedCompanies.some((sc) => sc.trim().toLowerCase() === target);
  };

  const toggleCompany = (companyName: string) => {
    const norm = companyName.trim();
    setSelectedCompanies((prev) => {
      const exists = prev.some((c) => c.trim().toLowerCase() === norm.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.trim().toLowerCase() !== norm.toLowerCase());
      } else {
        return [...prev, norm];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedCompanies(allAvailableCompanies.map((c) => c.name));
  };

  const handleClearAll = () => {
    setSelectedCompanies([]);
  };

  const handleAddCustomBrand = () => {
    const clean = customBrandInput.trim();
    if (!clean) return;
    if (!extraCompanies.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setExtraCompanies((prev) => [...prev, clean]);
    }
    // Auto-select it
    if (!selectedCompanies.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setSelectedCompanies((prev) => [...prev, clean]);
    }
    setCustomBrandInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanName) {
      setError("Please enter the executive name.");
      return;
    }
    if (!cleanUser) {
      setError("Please enter a login username.");
      return;
    }
    if (cleanPass.length < 6) {
      setError("Password must be at least 6 characters (Supabase Auth requirement).");
      return;
    }

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({
          name: cleanName,
          username: cleanUser,
          password: cleanPass,
          oldPassword: initialData?.password,
          companies: selectedCompanies,
        });
      }
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to register credentials in Supabase Auth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
      <CardHeader className="flex flex-row items-center justify-between pb-2.5 pt-3.5 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {initialData ? "Edit Executive Credentials" : "Add Executive Member"}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Assign name, multi-brand collection rights, and mobile login credentials.
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <CardContent className="space-y-3.5 px-4 py-3.5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Executive Name */}
          <div className="space-y-1">
            <Label htmlFor="exec-name" className="text-xs font-medium">
              Executive Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="exec-name"
              placeholder="e.g. Faisal Khan"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="text-xs h-8.5"
              required
              autoFocus
              disabled={Boolean(initialData) || loading}
            />
          </div>

          {/* Companies Handled (Multiple Selection) */}
          <div className="space-y-1.5 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>Companies Handled (Multi-Select)</span>
              </Label>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={loading || allAvailableCompanies.length === 0}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Select All ({allAvailableCompanies.length})
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={loading || selectedCompanies.length === 0}
                  className="text-muted-foreground hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Check all the companies/brands this executive is assigned to collect for. You can check multiple brands.
            </p>

            {/* Checkable Company List */}
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 border border-input rounded-md bg-muted/10">
              {allAvailableCompanies.map((c) => {
                const checked = isCompanySelected(c.name);
                return (
                  <label
                    key={c.id || c.name}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-all border cursor-pointer select-none",
                      checked
                        ? "bg-primary/10 border-primary/40 text-primary font-medium shadow-2xs"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCompany(c.name)}
                      disabled={loading}
                      className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                    />
                    <span className="truncate">{c.name}</span>
                    {c.code && (
                      <span className="text-[9px] font-mono text-muted-foreground/70 ml-auto uppercase">
                        {c.code}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Quick add custom company */}
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                placeholder="+ Add another brand name..."
                value={customBrandInput}
                onChange={(e) => setCustomBrandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomBrand();
                  }
                }}
                className="text-xs h-7.5"
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomBrand}
                disabled={loading || !customBrandInput.trim()}
                className="h-7.5 px-2.5 text-xs shrink-0 cursor-pointer"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {/* Selected Chips */}
            {selectedCompanies.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Selected ({selectedCompanies.length}):
                </span>
                {selectedCompanies.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 font-medium"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() => toggleCompany(c)}
                      className="hover:text-destructive cursor-pointer p-0.5"
                      title={`Remove ${c}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Login Username */}
          <div className="space-y-1 pt-1 border-t border-border/60">
            <Label htmlFor="exec-username" className="text-xs font-medium flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <span>Login Username <span className="text-destructive">*</span></span>
            </Label>
            <Input
              id="exec-username"
              placeholder="e.g. faisal"
              value={username}
              onChange={(e) => {
                setUserEditedUsername(true);
                setUsername(e.target.value);
              }}
              className="text-xs h-8.5 font-mono"
              required
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground">
              The executive uses this username to sign in on their mobile phone.
            </p>
          </div>

          {/* Login Password */}
          <div className="space-y-1">
            <Label htmlFor="exec-password" className="text-xs font-medium flex items-center gap-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span>Login Password (min 6 characters) <span className="text-destructive">*</span></span>
            </Label>
            <Input
              id="exec-password"
              placeholder="At least 6 characters (default: password123)"
              value={password}
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs h-8.5 font-mono"
              required
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground">
              Default: <code className="bg-muted px-1 py-0.2 rounded font-mono">password123</code>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 px-4 py-3 border-t border-border shrink-0 bg-muted/5">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="h-8 text-xs font-mono"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs font-medium gap-1.5 px-4">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            <span>{initialData ? "Update Credentials" : "Save Executive"}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
