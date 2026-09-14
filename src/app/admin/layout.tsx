"use client";

import * as React from "react";
import { useRouter, usePathname, notFound } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { getCurrentSession } from "@/lib/auth-service";
import { isDesktopApp } from "@/lib/desktop-utils";

import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/hooks/use-queries";
import {
  getCompanies,
  getExecutives,
  getShops,
  getShopMappings,
  getUploadBatches,
  getShopCollections,
} from "@/lib/supabase/collections-service";

import { UploadDraftProvider } from "@/lib/upload-draft-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [authorized, setAuthorized] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    // Strictly block direct /admin routes on web with 404 (only desktop is allowed)
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin") && !isDesktopApp()) {
      notFound();
      return;
    }

    const session = getCurrentSession();
    if (!session || session.role !== "admin") {
      const target = isDesktopApp() ? "/login" : "/login?admin=true";
      router.replace(target);
    } else {
      setAuthorized(true);
    }
  }, [router]);

  // Eagerly prefetch all admin routes and data into memory so tab switching is instantaneous
  React.useEffect(() => {
    if (authorized) {
      const basePath = pathname.startsWith("/global") ? "/global" : "/admin";
      const routes = [
        `${basePath}/dashboard`,
        `${basePath}/upload-history`,
        `${basePath}/mappings`,
        `${basePath}/companies`,
        `${basePath}/executives`,
        `${basePath}/shops`,
        `${basePath}/collections`,
        `${basePath}/settings`,
      ];
      routes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });

      // Background warm-up of core datasets
      queryClient.prefetchQuery({ queryKey: QUERY_KEYS.companies, queryFn: getCompanies, staleTime: 5 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: QUERY_KEYS.executives, queryFn: getExecutives, staleTime: 5 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: QUERY_KEYS.shops, queryFn: getShops, staleTime: 5 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: QUERY_KEYS.shopMappings, queryFn: getShopMappings, staleTime: 5 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: QUERY_KEYS.uploadBatches, queryFn: getUploadBatches, staleTime: 5 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: QUERY_KEYS.shopCollections, queryFn: getShopCollections, staleTime: 5 * 60 * 1000 });
    }
  }, [authorized, router, queryClient]);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center text-xs font-mono text-muted-foreground">
        Checking admin access...
      </div>
    );
  }

  return (
    <UploadDraftProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <AdminSidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex flex-1 flex-col min-w-0">
          <TopNavbar
            role="admin"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </UploadDraftProvider>
  );
}
