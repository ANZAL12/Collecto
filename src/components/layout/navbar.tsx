"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Bell, LogOut, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { navigationItems } from "./sidebar";

interface NavbarProps {
  onOpenMobileMenu?: () => void;
}

export function Navbar({ onOpenMobileMenu }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Find active navigation title
  const currentNav =
    navigationItems.find((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href)
    ) || navigationItems[0];

  const handleSignOut = () => {
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      {/* Left section: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileMenu}
            className="lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
          <span className="font-medium text-muted-foreground/70">Collecto</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="font-semibold text-foreground">
            {currentNav.title}
          </span>
        </div>
      </div>

      {/* Right section: Search hint, Notifications, Theme, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Subtle quick search hint for admin */}
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground md:flex">
          <Search className="h-3.5 w-3.5" />
          <span>Quick search (e.g. Shop, Exec)...</span>
          <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        {/* Notifications mock button */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-sky-500 ring-2 ring-card" />
        </Button>

        {/* Dark Mode Switcher */}
        <ThemeToggle />

        <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Sign out to login"
        >
          <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
