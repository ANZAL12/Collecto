"use client";

import * as React from "react";
import { ExecutiveLandingView } from "@/components/executives/executive-landing-view";

export default function ExecutiveDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-xs font-mono text-muted-foreground">
          Loading shops...
        </div>
      }
    >
      <ExecutiveLandingView />
    </React.Suspense>
  );
}
