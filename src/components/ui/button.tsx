import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-45 active:scale-[0.97] [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white shadow-glow hover:brightness-110 hover:shadow-[0_14px_44px_-8px_rgb(255_90_95/0.7)]",
        dark: "bg-ink text-white hover:bg-ink-soft shadow-soft",
        outline: "border border-ink/10 bg-white/70 text-ink backdrop-blur hover:bg-white hover:border-ink/20",
        ghost: "text-ink hover:bg-ink/5",
        subtle: "bg-ink/[0.05] text-ink hover:bg-ink/10",
        glass: "glass text-ink shadow-soft hover:bg-white/80",
        light: "bg-white text-ink shadow-soft hover:bg-white/90",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "text-bordeaux underline-offset-4 hover:underline rounded-none px-0",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6",
        lg: "h-14 px-8 text-[15px]",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
