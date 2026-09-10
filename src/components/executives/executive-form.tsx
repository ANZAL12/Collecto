"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { X } from "lucide-react";

interface ExecutiveFormProps {
  onClose?: () => void;
  onSubmit?: (data: { name: string }) => void;
}

export function ExecutiveForm({ onClose, onSubmit }: ExecutiveFormProps) {
  const [name, setName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (onSubmit) {
      onSubmit({ name: name.trim() });
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider">
          Add Executive Member
        </CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 px-4 pb-4">
          <div className="space-y-1">
            <Label htmlFor="exec-name">Executive Name</Label>
            <Input
              id="exec-name"
              placeholder="e.g. Faisal Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs h-8"
              required
              autoFocus
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 px-4 pb-4 pt-0">
          {onClose && (
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-7 text-xs">
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" className="h-7 text-xs font-medium">
            Save Executive
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
