"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, LogOut, Smartphone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentSession, logout } from "@/lib/auth-service";
import { UserSession } from "@/types";

interface TopNavbarProps {
  onOpenMobileMenu?: () => void;
  role: "admin" | "executive";
}

export function TopNavbar({ onOpenMobileMenu, role }: TopNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/global") ? "/global" : "/admin";
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  React.useEffect(() => {
    setUser(getCurrentSession());
  }, []);

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    router.replace("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between border-b border-border bg-background px-4">
        {/* Left: Mobile trigger & System identifier */}
        <div className="flex items-center gap-3">
          {onOpenMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenMobileMenu}
              className="lg:hidden h-7 w-7"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-foreground tracking-tight">
              Collecto
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground uppercase font-mono text-[11px]">
              {role}
            </span>
          </div>
        </div>

        {/* Right: User status, Theme & Logout */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 border-r border-border pr-2 text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{user.name}</span>
            </div>
          )}

          <ThemeToggle className="h-7 w-7" />

          {role === "admin" && (
            <Link
              href={`${basePath}/companies`}
              prefetch={true}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded px-2.5 py-1 bg-card hover:bg-muted transition-colors"
              title="Manage Companies / Brands"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Companies</span>
            </Link>
          )}

          <a
            href="/"
            className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 bg-card hover:bg-muted"
            title="Open Executive Mobile View"
          >
            <Smartphone className="h-3 w-3" />
            <span className="hidden sm:inline">Executive View</span>
          </a>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogoutConfirm(true)}
            className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
            title="Sign out of Collecto"
          >
            <LogOut className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

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
              You will need to sign back in with your admin credentials to access this portal.
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
    </>
  );
}
