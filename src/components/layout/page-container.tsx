import * as React from "react";
import { PageContainerProps } from "@/types";
import { cn } from "@/lib/utils";

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn("space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full", className)}>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>
        )}
      </div>

      {/* Main Page Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
