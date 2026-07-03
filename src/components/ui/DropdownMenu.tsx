import * as React from "react";
import { cn } from "../../lib/utils";

export interface DropdownItem {
  label: React.ReactNode;
  value: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  align?: "start" | "end";
  /** Which side of the trigger the menu opens toward. */
  side?: "top" | "bottom";
  className?: string;
}

/** Minimal click-to-open dropdown menu with outside-click dismissal. */
export function DropdownMenu({
  trigger,
  items,
  onSelect,
  align = "start",
  side = "bottom",
  className,
}: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      {open && (
        <div
          className={cn(
            "absolute z-50 min-w-[180px] overflow-hidden rounded-lg border border-border bg-bg-elevated p-1 shadow-panel animate-fade-in",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((it) => (
            <button
              key={it.value}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-panel-2 hover:text-fg"
              onClick={() => {
                onSelect(it.value);
                setOpen(false);
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
