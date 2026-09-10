import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background",
        secondary:
          "bg-secondary text-secondary-foreground",
        outline:
          "border border-border text-foreground",
        muted:
          "bg-muted text-muted-foreground",
        success:
          "border border-border text-foreground font-mono",
        warning:
          "border border-border text-foreground font-mono",
        info:
          "border border-border text-foreground font-mono",
        destructive:
          "border border-border text-foreground font-mono",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
