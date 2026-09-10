"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Receipt, User, X, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types";

export const executiveNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/executive/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Assigned Shops",
    href: "/executive/shops",
    icon: Store,
  },
  {
    title: "Collections",
    href: "/executive/collections",
    icon: Receipt,
  },
  {
    title: "Profile",
    href: "/executive/profile",
    icon: User,
  },
];

interface ExecutiveSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function ExecutiveSidebar({ isOpen, onClose, className }: ExecutiveSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-56 flex-col border-r border-border bg-background transition-transform duration-150 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Brand Bar */}
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <Link
            href="/executive/dashboard"
            className="flex items-center gap-2 font-semibold tracking-tight text-foreground text-sm"
          >
            <span>Collecto</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              Field
            </span>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:text-foreground lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <nav className="space-y-0.5">
            {executiveNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/executive/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between rounded px-2.5 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
