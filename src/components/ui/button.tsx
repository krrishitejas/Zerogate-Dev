"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-[13px] uppercase tracking-[0.16em] font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-amber-phosphor text-ink hover:bg-amber-soft hover:shadow-[0_0_28px_-4px_hsl(var(--amber)/0.7)] border border-amber-phosphor",
        secondary:
          "bg-ink-2 text-cream hover:bg-ink-3 border border-rule hover:border-amber-phosphor/50",
        outline:
          "border border-rule bg-transparent text-cream hover:border-amber-phosphor hover:text-amber-phosphor hover:bg-amber-phosphor/5",
        ghost:
          "text-cream-dim hover:bg-ink-3 hover:text-amber-phosphor",
        destructive:
          "bg-crit text-cream hover:bg-crit/90 border border-crit",
        link:
          "text-amber-phosphor underline-offset-4 hover:underline normal-case tracking-normal"
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-[11px]",
        lg: "h-12 px-7 text-[14px]",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
