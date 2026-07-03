import * as React from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-violet-500 to-cyan-400 text-white hover:from-violet-600 hover:to-cyan-500 shadow-[0_6px_20px_-6px_rgba(124,58,237,0.5)]",
  ghost: "bg-transparent text-fg-muted hover:bg-panel-2 hover:text-fg",
  outline: "border border-border bg-transparent text-fg hover:bg-panel-2",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
  subtle: "bg-panel-2 text-fg hover:bg-border",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
  icon: "h-10 w-10 justify-center",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "md", active, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center rounded-md font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        variants[variant],
        sizes[size],
        active && "bg-brand-soft text-brand ring-1 ring-brand/40",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
