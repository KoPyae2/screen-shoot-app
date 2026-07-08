import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Custom dropdown that renders its menu in a portal so it never gets clipped
 * by a scrolling panel. Closes on outside-click, Escape, scroll and resize —
 * matching the pattern used by the header language menu.
 */
export function Select({ value, options, onChange, ariaLabel, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const selected = options.find((o) => o.value === value);

  const place = React.useCallback(() => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  }, []);

  React.useEffect(() => {
    if (!open) return;
    place();
    const onDoc = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onScroll = (e: Event) => {
      // Scrolling INSIDE the menu must not dismiss it — only an ancestor
      // panel scrolling (which would detach the menu from its button) does.
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-hairline bg-sunken px-2.5 py-1.5 text-xs font-medium text-fg outline-none transition-colors hover:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/60",
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown size={13} className={cn("shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="fixed z-[9999] max-h-64 overflow-y-auto rounded-lg border border-border bg-bg-elevated p-1 shadow-panel animate-fade-in scrollbar-thin"
            style={{ top: rect.bottom + 4, left: rect.left, width: rect.width }}
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                    active ? "bg-brand/15 text-fg" : "text-fg-muted hover:bg-panel-2 hover:text-fg",
                  )}
                >
                  <span className="w-3.5 shrink-0">
                    {active && <Check size={13} className="text-brand" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
