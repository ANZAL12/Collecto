"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/mock-auth";

export default function ExecutiveProfilePage() {
  const user = getCurrentUser();

  return (
    <ErpContainer
      title="Profile"
      badge="Executive"
      description="Field agent account information."
    >
      <Card className="border-border max-w-sm">
        <CardHeader className="py-2.5 px-4 border-b border-border">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 text-xs">
          <div>
            <span className="text-muted-foreground">Executive Name:</span>{" "}
            <span className="font-semibold text-foreground">{user.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Role:</span>{" "}
            <span className="font-mono text-foreground uppercase">Executive</span>
          </div>
        </CardContent>
      </Card>
    </ErpContainer>
  );
}
