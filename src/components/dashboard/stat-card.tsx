import * as React from "react";
import { StatCardProps } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-border/80 bg-card/90 backdrop-blur-xs transition-all duration-200 hover:shadow-md hover:border-border",
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {title}
          </p>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/80 text-foreground ring-1 ring-border/50">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {value}
          </div>
          {change && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tracking-tight",
                changeType === "positive" &&
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                changeType === "negative" &&
                  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                changeType === "neutral" &&
                  "bg-muted text-muted-foreground"
              )}
            >
              {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
              {changeType === "negative" && <TrendingDown className="h-3 w-3" />}
              {changeType === "neutral" && <Minus className="h-3 w-3" />}
              {change}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-2 text-xs text-muted-foreground/80 line-clamp-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
