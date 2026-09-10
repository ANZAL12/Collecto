"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { X, Lock, User, AlertCircle, Loader2 } from "lucide-react";

interface ExecutiveFormProps {
  onClose?: () => void;
  onSubmit?: (data: { name: string; username: string; password: string; oldPassword?: string }) => Promise<void> | void;
  initialData?: { name: string; username?: string; password?: string };
}

export function ExecutiveForm({ onClose, onSubmit, initialData }: ExecutiveFormProps) {
  const [name, setName] = React.useState(initialData?.name || "");
  const [username, setUsername] = React.useState(initialData?.username || "");
  const [password, setPassword] = React.useState(initialData?.password || "password123");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [userEditedUsername, setUserEditedUsername] = React.useState(Boolean(initialData?.username));

  // Auto-generate username from name if not manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!userEditedUsername) {
      const generated = val
        .toLowerCase()
        .trim()
        .split(/\s+/)[0]
        .replace(/[^a-z0-9]/g, "");
      setUsername(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanName) {
      setError("Please enter the executive name.");
      return;
    }
    if (!cleanUser) {
      setError("Please enter a login username.");
      return;
    }
    if (cleanPass.length < 6) {
      setError("Password must be at least 6 characters (Supabase Auth requirement).");
      return;
    }

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({
          name: cleanName,
          username: cleanUser,
          password: cleanPass,
          oldPassword: initialData?.password,
        });
      }
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to register credentials in Supabase Auth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2.5 pt-3.5 px-4 border-b border-border">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {initialData ? "Edit Executive Credentials" : "Add Executive Member"}
        </CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 px-4 py-3.5">
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Executive Name */}
          <div className="space-y-1">
            <Label htmlFor="exec-name" className="text-xs font-medium">
              Executive Name
            </Label>
            <Input
              id="exec-name"
              placeholder="e.g. Faisal Khan"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="text-xs h-8.5"
              required
              autoFocus
              disabled={Boolean(initialData) || loading}
            />
          </div>

          {/* Login Username */}
          <div className="space-y-1">
            <Label htmlFor="exec-username" className="text-xs font-medium flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground" />
              <span>Login Username</span>
            </Label>
            <Input
              id="exec-username"
              placeholder="e.g. faisal"
              value={username}
              onChange={(e) => {
                setUserEditedUsername(true);
                setUsername(e.target.value);
              }}
              className="text-xs h-8.5 font-mono"
              required
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground">
              The executive uses this username to sign in on their mobile phone.
            </p>
          </div>

          {/* Login Password */}
          <div className="space-y-1">
            <Label htmlFor="exec-password" className="text-xs font-medium flex items-center gap-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span>Login Password (min 6 characters)</span>
            </Label>
            <Input
              id="exec-password"
              placeholder="At least 6 characters (default: password123)"
              value={password}
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs h-8.5 font-mono"
              required
              disabled={loading}
            />
            <p className="text-[10px] text-muted-foreground">
              Must be at least 6 characters (required by Supabase Auth). Default: <code className="bg-muted px-1 py-0.2 rounded font-mono">password123</code>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 px-4 pb-3.5 pt-0 border-t border-border pt-3">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="h-7 text-xs font-mono"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={loading} className="h-7 text-xs font-medium gap-1.5">
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{initialData ? "Update Credentials" : "Save Executive"}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
