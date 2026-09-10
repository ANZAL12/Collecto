"use client";

import * as React from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Receipt,
  RotateCcw,
} from "lucide-react";
import {
  useExecutives,
  useShops,
  useShopCollections,
  useTogglePaymentStatusMutation,
} from "@/lib/hooks/use-queries";
import { useRouter } from "next/navigation";
import { getCurrentSession, logout } from "@/lib/auth-service";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShopCollection, UserSession, CollectionItem } from "@/types";
import { LogOut } from "lucide-react";

export interface ShopCardData {
  name: string;
  invoices: ShopCollection[];
  pendingAmount: number;
  totalAmount: number;
  unpaidCount: number;
  paidCount: number;
  allPaid: boolean;
}

interface ExecutiveLandingViewProps {
  session?: UserSession | null;
  onLogout?: () => void;
}

export function ExecutiveLandingView({ session: propSession, onLogout }: ExecutiveLandingViewProps = {}) {
  const router = useRouter();
  const [session, setSession] = React.useState<UserSession | null>(() => propSession || getCurrentSession());
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(!propSession);

  React.useEffect(() => {
    if (propSession) {
      setSession(propSession);
      setIsCheckingAuth(false);
      return;
    }
    const current = getCurrentSession();
    if (!current) {
      router.replace("/login");
    } else {
      setSession(current);
      setIsCheckingAuth(false);
    }
  }, [propSession, router]);

  const { data: executives = [] } = useExecutives();
  const { data: allShops = [], isLoading: isLoadingShops } = useShops();
  const { data: allCollections = [], isLoading: isLoadingColls } = useShopCollections();

  const togglePaymentMutation = useTogglePaymentStatusMutation();

  const isAdmin = session?.role === "admin";
  const [adminSelectedExec, setAdminSelectedExec] = React.useState<string>("");

  // Default admin preview to first available executive
  React.useEffect(() => {
    if (isAdmin && !adminSelectedExec && executives.length > 0) {
      setAdminSelectedExec(executives[0].name);
    }
  }, [isAdmin, adminSelectedExec, executives]);

  // Active executive name (admin can switch preview, executive is locked to self)
  const activeExecutive = React.useMemo(() => {
    if (isAdmin) {
      return adminSelectedExec || executives[0]?.name || "";
    }
    return session?.name || "";
  }, [isAdmin, adminSelectedExec, executives, session]);

  // Search query
  const [searchQuery, setSearchQuery] = React.useState("");

  // Set of expanded shop names
  const [expandedShopNames, setExpandedShopNames] = React.useState<Set<string>>(new Set());

  // Collections for this executive (STRICT: only collections assigned to this executive)
  const executiveCollections = React.useMemo(() => {
    if (!activeExecutive) return [];
    return allCollections.filter(
      (c) => c.executiveName?.trim().toLowerCase() === activeExecutive.trim().toLowerCase()
    );
  }, [allCollections, activeExecutive]);

  // Shops assigned to this executive (STRICT: only shops mapped to this executive)
  const executiveShops = React.useMemo(() => {
    if (!activeExecutive) return [];
    return allShops.filter(
      (s) => s.assignedExecutiveName?.trim().toLowerCase() === activeExecutive.trim().toLowerCase()
    );
  }, [allShops, activeExecutive]);

  // Group collections under each shop
  const shops: ShopCardData[] = React.useMemo(() => {
    const shopMap = new Map<string, ShopCollection[]>();

    // 1. Add all shops
    for (const shop of executiveShops) {
      shopMap.set(shop.name.trim().toLowerCase(), []);
    }

    // 2. Add collections
    for (const col of executiveCollections) {
      const key = col.shopName.trim().toLowerCase();
      const existing = shopMap.get(key);
      if (existing) {
        existing.push(col);
      } else {
        shopMap.set(key, [col]);
      }
    }

    // Canonical names map
    const canonicalNameMap = new Map<string, string>();
    for (const s of executiveShops) canonicalNameMap.set(s.name.trim().toLowerCase(), s.name);
    for (const c of executiveCollections) {
      if (!canonicalNameMap.has(c.shopName.trim().toLowerCase())) {
        canonicalNameMap.set(c.shopName.trim().toLowerCase(), c.shopName);
      }
    }

    const list: ShopCardData[] = [];

    shopMap.forEach((invoices, key) => {
      const displayName = canonicalNameMap.get(key) || key;
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const unpaidInvoices = invoices.filter((inv) => !inv.isPaid);
      const pendingAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const paidCount = invoices.filter((inv) => inv.isPaid).length;
      const unpaidCount = unpaidInvoices.length;
      const allPaid = invoices.length > 0 && unpaidCount === 0;

      list.push({
        name: displayName,
        invoices,
        pendingAmount,
        totalAmount,
        unpaidCount,
        paidCount,
        allPaid,
      });
    });

    // Sort: pending dues first, then alphabetically
    return list.sort((a, b) => {
      if (a.pendingAmount > 0 && b.pendingAmount === 0) return -1;
      if (a.pendingAmount === 0 && b.pendingAmount > 0) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [executiveShops, executiveCollections]);

  // Filtered by search
  const filteredShops = React.useMemo(() => {
    if (!searchQuery.trim()) return shops;
    const q = searchQuery.toLowerCase();
    return shops.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchInvoice = s.invoices.some(
        (inv: ShopCollection) =>
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.items?.some((it: CollectionItem) => it.productName.toLowerCase().includes(q))
      );
      return matchName || matchInvoice;
    });
  }, [shops, searchQuery]);

  // Toggle card expansion
  const toggleShop = (shopName: string) => {
    setExpandedShopNames((prev) => {
      const next = new Set(prev);
      if (next.has(shopName)) next.delete(shopName);
      else next.add(shopName);
      return next;
    });
  };

  // Reversible payment toggle (Paid <-> Unpaid)
  const handleTogglePayment = async (
    e: React.MouseEvent,
    invoiceId: string,
    currentStatus: boolean | undefined
  ) => {
    e.stopPropagation();
    await togglePaymentMutation.mutateAsync({
      invoiceId,
      isPaid: !currentStatus,
    });
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    if (onLogout) {
      onLogout();
    } else {
      router.replace("/login");
    }
  };

  const isLoading = isLoadingShops || isLoadingColls;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-mono text-muted-foreground">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {/* Admin Executive Switcher (Only visible to Admin) */}
        {isAdmin && (
          <div className="flex items-center justify-between bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">Previewing:</span>
              <select
                value={activeExecutive}
                onChange={(e) => setAdminSelectedExec(e.target.value)}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground"
              >
                {executives.map((ex) => (
                  <option key={ex.id} value={ex.name}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>
            <a
              href="/admin/dashboard"
              className="text-[11px] font-mono font-medium text-foreground hover:underline"
            >
              Admin Portal &rarr;
            </a>
          </div>
        )}

        {/* Search Option at Top with Logout Button */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm rounded-xl border border-border bg-card shadow-2xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border border-border bg-card shadow-2xs text-muted-foreground hover:text-foreground transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* SHOPS AS CARDS */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-mono">
            Loading shops...
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? `No shops found matching "${searchQuery}"`
                : activeExecutive
                ? `No shops assigned to ${activeExecutive} yet. Contact admin to assign shops.`
                : "No shops assigned to your account."}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="h-7 text-xs font-mono"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredShops.map((shop) => {
              const isExpanded = expandedShopNames.has(shop.name);

              return (
                <div
                  key={shop.name}
                  className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden transition-all"
                >
                  {/* Shop Card (Click to expand details) */}
                  <button
                    type="button"
                    onClick={() => toggleShop(shop.name)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-3 cursor-pointer focus:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold text-foreground leading-snug truncate">
                        {shop.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-muted-foreground">
                        {shop.invoices.length === 0 ? (
                          <span>No bills</span>
                        ) : shop.allPaid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            All Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="h-3 w-3" />
                            {shop.unpaidCount} Pending
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {shop.invoices.length} {shop.invoices.length === 1 ? "bill" : "bills"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="text-sm font-bold font-mono text-foreground">
                          {formatCurrency(
                            shop.pendingAmount > 0 ? shop.pendingAmount : shop.totalAmount
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground block">
                          {shop.pendingAmount > 0 ? "Pending" : "Cleared"}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* DETAILS UNDER THE SHOP (Invoices, items, and reversible paid status) */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-3 space-y-2.5">
                      {shop.invoices.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2 italic">
                          No collection invoices for this shop.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {shop.invoices.map((inv: ShopCollection) => (
                            <div
                              key={inv.id}
                              className={`rounded-lg border p-2.5 text-xs transition-colors ${
                                inv.isPaid
                                  ? "border-border/60 bg-background/60 opacity-80"
                                  : "border-border bg-background shadow-2xs"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground">
                                    <Receipt className="h-3 w-3 text-muted-foreground" />
                                    <span>#{inv.invoiceNo}</span>
                                  </div>
                                  {inv.invoiceDate && (
                                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                      {inv.invoiceDate}
                                    </div>
                                  )}
                                </div>

                                <div className="text-right font-mono">
                                  <span className="font-bold text-foreground">
                                    {formatCurrency(inv.totalAmount)}
                                  </span>
                                </div>
                              </div>

                              {/* Items list if any */}
                              {inv.items && inv.items.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                  {inv.items.map((it: CollectionItem, idx: number) => (
                                    <div
                                      key={it.id || idx}
                                      className="flex items-center justify-between text-[11px] font-mono text-muted-foreground"
                                    >
                                      <span className="truncate mr-2 text-foreground">
                                        {it.productName}
                                      </span>
                                      <span className="shrink-0">
                                        x{it.quantity} • {formatCurrency(it.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reversible Mark Paid / Unpaid Button */}
                              <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono">
                                  {inv.isPaid ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Paid
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Pending
                                    </span>
                                  )}
                                </span>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={inv.isPaid ? "outline" : "default"}
                                  disabled={togglePaymentMutation.isPending}
                                  onClick={(e) => handleTogglePayment(e, inv.id, inv.isPaid)}
                                  className={`h-7 px-2.5 text-xs font-mono gap-1.5 ${
                                    inv.isPaid
                                      ? "text-muted-foreground hover:text-foreground"
                                      : "bg-foreground text-background font-medium"
                                  }`}
                                >
                                  {inv.isPaid ? (
                                    <>
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Mark Unpaid</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span>Mark Paid</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Sign Out</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to log out?
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
              You will need your username and password to sign back in on this device.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-9 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmLogout}
                className="h-9 text-xs font-medium gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
