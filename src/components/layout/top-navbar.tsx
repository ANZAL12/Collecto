"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser, setCurrentUser, clearCurrentUser, MOCK_ADMIN_USER, MOCK_EXECUTIVE_USER } from "@/lib/mock-auth";
import { UserSession } from "@/types";

interface TopNavbarProps {
  onOpenMobileMenu?: () => void;
  role: "admin" | "executive";
}

export function TopNavbar({ onOpenMobileMenu, role }: TopNavbarProps) {
  const router = useRouter();
  const [user, setUser] = React.useState<UserSession>(() => getCurrentUser());

  React.useEffect(() => {
    setUser(getCurrentUser());
  }, [role]);

  const handleLogout = () => {
    clearCurrentUser();
    router.push("/login");
  };

  const handleQuickSwitchRole = () => {
    if (role === "admin") {
      setCurrentUser(MOCK_EXECUTIVE_USER);
      router.push("/executive/dashboard");
    } else {
      setCurrentUser(MOCK_ADMIN_USER);
      router.push("/admin/dashboard");
    }
  };

  return (
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

      {/* Right: User status, Role switcher, Theme & Logout */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 border-r border-border pr-2 text-xs text-muted-foreground">
          <span className="text-foreground">{user.name}</span>
          <span>({user.email})</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleQuickSwitchRole}
          className="h-7 text-xs px-2"
        >
          <ArrowLeftRight className="h-3 w-3 mr-1" />
          <span>Switch to {role === "admin" ? "Executive" : "Admin"}</span>
        </Button>

        <ThemeToggle className="h-7 w-7" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
        >
          <LogOut className="h-3 w-3 sm:mr-1" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
