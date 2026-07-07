import * as React from "react";
import { cn } from "../../lib/utils";

interface TooltipProps {
  label: React.ReactNode;
  /** Optional keyboard shortcut rendered as a small <kbd> chip after the label. */
  shortcut?: string;
  side?: "top" | "bottom" | "right" | "left";
  children: React.ReactNode;
  className?: string;
}

const sideClass: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
};

/** Pure-CSS hover tooltip — no external dependency. */
export function Tooltip({ label, shortcut, side = "top", children, className }: TooltipProps) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 hidden items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2 py-1 text-xs text-fg shadow-panel group-hover/tip:inline-flex animate-fade-in",
          sideClass[side],
        )}
      >
        {label}
        {shortcut && (
          <kbd className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded border border-hairline bg-sunken px-1 font-sans text-[10px] font-semibold leading-none text-fg-muted">
            {shortcut}
          </kbd>
        )}
      </span>
    </span>
  );
}
