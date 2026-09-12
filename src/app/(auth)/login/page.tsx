"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { authenticate } from "@/lib/auth-service";
import { useExecutives } from "@/lib/hooks/use-queries";
import { UserSession } from "@/types";
import { isDesktopApp } from "@/lib/desktop-utils";

interface LoginPageProps {
  onLoginSuccess?: (session: UserSession) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps = {}) {
  const router = useRouter();
  const { data: executives = [] } = useExecutives();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    setIsDesktop(isDesktopApp());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authenticate(username, password);

      if (result.success && result.session) {
        if (result.session.role === "admin" && !isDesktopApp()) {
          setError("Admin access is restricted to the desktop application.");
          return;
        }

        if (onLoginSuccess) {
          onLoginSuccess(result.session);
        }
        if (result.session.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/");
        }
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch {
      setError("An unexpected error occurred during sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="h-8 w-8" />
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Collecto
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in to access collections & field operations
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 border-b border-border">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Login
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-3.5 px-4 pt-4 pb-3">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="username" className="text-xs flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>{isDesktop ? "Admin Gmail / Username" : "Username"}</span>
                </Label>
                <Input
                  id="username"
                  type="text"
                  required
                  placeholder={isDesktop ? "Enter admin Gmail" : "Enter your username"}
                  value={username}
                  onChange={(e) => {
                    setError(null);
                    setUsername(e.target.value);
                  }}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <span>Password</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setError(null);
                    setPassword(e.target.value);
                  }}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-1 pb-4 px-4 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 text-xs font-medium gap-1.5"
              >
                <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>

              <p className="text-[11px] text-muted-foreground text-center pt-1 border-t border-border/50 w-full">
                Forgot password? Contact admin
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
