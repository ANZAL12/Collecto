"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { setCurrentUser, MOCK_ADMIN_USER, MOCK_EXECUTIVE_USER } from "@/lib/mock-auth";
import { UserRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>("admin");
  const [username, setUsername] = React.useState("admin@collecto.app");
  const [password, setPassword] = React.useState("••••••••");

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === "admin") {
      setUsername("admin@collecto.app");
    } else {
      setUsername("rajesh.k@collecto.app");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (role === "admin") {
      setCurrentUser(MOCK_ADMIN_USER);
      router.push("/admin/dashboard");
    } else {
      setCurrentUser(MOCK_EXECUTIVE_USER);
      router.push("/executive/dashboard");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="h-8 w-8" />
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Collecto
          </h1>
          <p className="text-xs text-muted-foreground">
            Collection management system
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sign In
            </CardTitle>

            {/* Minimal Role Tabs */}
            <div className="grid grid-cols-2 gap-1 rounded border border-border bg-muted/40 p-1 mt-2">
              <button
                type="button"
                onClick={() => handleRoleSelect("admin")}
                className={`rounded py-1 text-xs font-medium transition-all ${
                  role === "admin"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect("executive")}
                className={`rounded py-1 text-xs font-medium transition-all ${
                  role === "executive"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Executive
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="space-y-1">
                <Label htmlFor="username">Username / Email</Label>
                <Input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-0 pb-4 px-4">
              <Button type="submit" className="w-full h-8 text-xs font-medium gap-1.5">
                <span>Sign In as {role === "admin" ? "Admin" : "Executive"}</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
