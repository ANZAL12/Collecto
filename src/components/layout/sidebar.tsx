"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  History,
  Users,
  Store,
  GitFork,
  IndianRupee,
  Settings,
  ShieldCheck,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types";

export const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Upload Center & KPI Overview",
  },
  {
    title: "Uploads",
    href: "/dashboard/uploads",
    icon: Upload,
    description: "Import Excel Collections",
  },
  {
    title: "Upload History",
    href: "/dashboard/upload-history",
    icon: History,
    badge: "3",
    description: "Audit Trail & Logs",
  },
  {
    title: "Companies",
    href: "/admin/companies",
    icon: Building2,
    description: "Brands & Manufacturers",
  },
  {
    title: "Executives",
    href: "/dashboard/executives",
    icon: Users,
    badge: "26",
    description: "Field Staff & Targets",
  },
  {
    title: "Shops",
    href: "/dashboard/shops",
    icon: Store,
    badge: "438",
    description: "Retailers & Merchants",
  },
  {
    title: "Mappings",
    href: "/dashboard/mappings",
    icon: GitFork,
    badge: "3 pending",
    description: "Shop to Executive link",
  },
  {
    title: "Collections",
    href: "/dashboard/collections",
    icon: IndianRupee,
    description: "Payment & Receipts",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    description: "Preferences & Config",
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ isOpen, onClose, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xs lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold tracking-tight text-foreground"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold leading-none">Collecto</span>
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Collection Ops
              </span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-3 mb-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Main Menu
            </p>
          </div>

          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Card */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-sm text-primary">
              AD
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-xs font-semibold text-foreground">
                Admin Supervisor
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                admin@collecto.app
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
