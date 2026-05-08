import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center font-mono text-[10px] uppercase tracking-widest font-bold transition-all border-2",
  {
    variants: {
      variant: {
        default: "bg-acid text-ink border-ink",
        secondary: "bg-paper-2 text-ink border-ink",
        destructive: "bg-[var(--riso-red)] text-paper border-ink",
        outline: "bg-transparent text-ink border-ink",
        accent: "bg-[var(--riso-blue)] text-paper border-ink",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
