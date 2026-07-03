import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  /** Optional element rendered on the right side of the header (e.g. a count badge). */
  headerAside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible modal shell: dims + blurs the background, closes on backdrop
 * click and on Escape, and locks body scroll while open. Clicking inside the
 * panel never bubbles to the backdrop.
 */
export function Modal({
  open,
  onClose,
  title,
  icon,
  headerAside,
  children,
  className,
}: ModalProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop backdrop-blur-sm p-4"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[86vh] w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-panel m-auto",
          className,
        )}
      >
        {(title || icon) && (
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              {icon}
              <h2 className="truncate text-sm font-semibold">{title}</h2>
              {headerAside}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("ui.close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}