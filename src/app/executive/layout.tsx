"use client";

import * as React from "react";
import { ExecutiveSidebar } from "@/components/layout/executive-sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";

export default function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ExecutiveSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <TopNavbar
          role="executive"
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
