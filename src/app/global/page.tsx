"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { unlockWebAdmin } from "@/lib/desktop-utils";
import { getCurrentSession } from "@/lib/auth-service";
import { Button } from "@/components/ui/button";

export default function GlobalSecretAdminPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = React.useState(true);

  React.useEffect(() => {
    // 1. Permanently unlock web admin in browser cookie & localStorage
    unlockWebAdmin();

    // 2. Check current session status
    const session = getCurrentSession();

    const timer = setTimeout(() => {
      if (session && session.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/login?unlocked=1");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight">
            Admin Web Access Unlocked
          </h1>
          <p className="text-xs text-muted-foreground">
            Secret portal key verified. Initializing administrative environment...
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={() => router.replace("/admin/dashboard")}
            className="w-full h-9 text-xs font-medium gap-1.5"
          >
            <span>Proceed to Admin Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
