import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-bold text-sm tracking-wide transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 border-foreground cursor-pointer select-none",
  {
    variants: {
      variant: {
        default: "bg-acid text-ink border-ink shadow-[3px_3px_0_0_var(--ink)] hover:translate-[-2px,-2px] hover:shadow-[5px_5px_0_0_var(--ink)]",
        destructive: "bg-[var(--riso-red)] text-paper border-ink shadow-[3px_3px_0_0_var(--ink)] hover:translate-[-2px,-2px] hover:shadow-[5px_5px_0_0_var(--ink)]",
        outline: "bg-transparent text-ink border-foreground shadow-[3px_3px_0_0_var(--ink)] hover:translate-[-2px,-2px] hover:shadow-[5px_5px_0_0_var(--ink)]",
        secondary: "bg-paper-2 text-ink border-ink shadow-[3px_3px_0_0_var(--ink)] hover:translate-[-2px,-2px] hover:shadow-[5px_5px_0_0_var(--ink)]",
        ghost: "bg-transparent text-ink border-transparent shadow-none hover:bg-paper-2 hover:border-foreground hover:shadow-[2px_2px_0_0_var(--ink)] hover:translate-[-1px,-1px]",
        link: "text-ink underline-offset-4 hover:underline border-transparent shadow-none",
      },
      size: {
        default: "h-10 px-5 py-2.5 rounded-md",
        sm: "h-8 px-3 text-xs rounded-sm",
        lg: "h-12 px-8 text-base rounded-md",
        icon: "h-9 w-9 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
