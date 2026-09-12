"use client";

import * as React from "react";
import { ErpContainer } from "@/components/layout/erp-container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/mock-auth";
import { Check, Building2, UserCircle, Palette } from "lucide-react";

export default function AdminSettingsPage() {
  const user = getCurrentUser();
  const [saved, setSaved] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ErpContainer
      title="System Settings"
      badge="Admin"
      description="System identity, company profile, and operational preferences."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
        <div className="space-y-4">
          <Card className="border-border"> 
            <CardHeader className="py-3.5 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-primary" />
                Administrator Profile
              </CardTitle>
              <CardDescription className="text-[11px]">
                Active logged in account credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-xs">
              <div>
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-semibold text-foreground">{user.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-mono text-foreground">{user.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Access Role:</span>{" "}
                <span className="font-semibold uppercase text-primary">ADMIN (Full Access)</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="py-3.5 px-4 border-b border-border">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Theme Preference
              </CardTitle>
              <CardDescription className="text-[11px]">
                Switch between light and dark modes for the ERP interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between p-4">
              <div className="text-xs">
                <p className="font-medium text-foreground">Color Mode</p>
                <p className="text-[11px] text-muted-foreground">Toggle Light / Dark theme</p>
              </div>
              <ThemeToggle className="h-8 w-8" />
            </CardContent>
          </Card>
        </div>
      </div>
    </ErpContainer>
  );
}
