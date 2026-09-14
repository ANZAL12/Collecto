"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UploadCloud,
  FileClock,
  Users,
  Store,
  GitFork,
  TableProperties,
  Settings,
  Building2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadDraft } from "@/lib/upload-draft-context";

export const adminNavConfigs = [
  {
    title: "Upload Sale Details",
    path: "/dashboard",
    icon: UploadCloud,
  },
  {
    title: "Upload History",
    path: "/upload-history",
    icon: FileClock,
  },
  {
    title: "Shop Mappings",
    path: "/mappings",
    icon: GitFork,
  },
  {
    title: "Companies",
    path: "/companies",
    icon: Building2,
  },
  {
    title: "Executives",
    path: "/executives",
    icon: Users,
  },
  {
    title: "Shops",
    path: "/shops",
    icon: Store,
  },
  {
    title: "Collections",
    path: "/collections",
    icon: TableProperties,
  },
  {
    title: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function AdminSidebar({ isOpen, onClose, className }: AdminSidebarProps) {
  const pathname = usePathname();
  const basePath = pathname?.startsWith("/global") ? "/global" : "/admin";

  let hasUploadDraft = false;
  try {
    const draft = useUploadDraft();
    hasUploadDraft = draft.hasDraft;
  } catch {}

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
          "fixed top-0 bottom-0 left-0 z-50 flex w-52 flex-col border-r border-border bg-background transition-transform duration-150 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Brand Bar */}
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <Link
            href={`${basePath}/dashboard`}
            className="flex items-center gap-2 font-semibold tracking-tight text-foreground text-sm"
          >
            <span>Collecto</span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              Admin
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
            {adminNavConfigs.map((item) => {
              const fullHref = `${basePath}${item.path}`;
              const isActive =
                pathname === fullHref ||
                (item.path !== "/dashboard" && pathname.startsWith(fullHref));
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  href={fullHref}
                  prefetch={true}
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

                  {item.path === "/dashboard" && hasUploadDraft ? (
                    <span className="flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] font-semibold font-mono text-amber-600 dark:text-amber-400 animate-pulse">
                      Draft
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
