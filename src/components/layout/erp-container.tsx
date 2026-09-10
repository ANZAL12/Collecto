import * as React from "react";
import { cn } from "@/lib/utils";

interface ErpContainerProps {
  title: string;
  badge?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ErpContainer({
  title,
  badge,
  description,
  actions,
  children,
  className,
}: ErpContainerProps) {
  return (
    <div className={cn("p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-4", className)}>
      {/* Header Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {badge && (
              <span className="rounded border border-border px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground uppercase">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
