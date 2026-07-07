import * as React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

interface PanelProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional extra content under the description (e.g. a count chip). */
  meta?: React.ReactNode;
  /** Icon shown inside the danger halo. Defaults to a warning triangle. */
  icon?: React.ReactNode;
  cancelLabel: React.ReactNode;
  confirmLabel: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  /** Focus the Cancel button on mount (safe default for destructive actions). */
  autoFocusCancel?: boolean;
  titleId?: string;
  className?: string;
}

/**
 * The visual card of the confirmation dialog, without portal/backdrop.
 * Exported separately so previews and stories can mount the open state
 * inside a contained area without portal side effects.
 */
export function ConfirmDialogPanel({
  title,
  description,
  meta,
  icon,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  autoFocusCancel = true,
  titleId,
  className,
}: PanelProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (autoFocusCancel) cancelRef.current?.focus();
  }, [autoFocusCancel]);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "w-[400px] max-w-[92vw] rounded-2xl border border-border bg-bg-elevated p-6 pt-7 shadow-panel",
        className,
      )}
    >
      {/* Danger icon inside a soft concentric halo — visual gravity without alarm. */}
      <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-danger/5 ring-1 ring-inset ring-danger/10">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-danger/10 text-danger">
          {icon ?? <AlertTriangle size={22} strokeWidth={2} />}
        </div>
      </div>

      <h2 id={titleId} className="mt-4 text-center text-base font-semibold text-fg">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-center text-sm leading-relaxed text-fg-muted">
          {description}
        </p>
      )}
      {meta && <div className="mt-3 flex justify-center">{meta}</div>}

      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Button
          ref={cancelRef}
          variant="subtle"
          className="justify-center"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="destructive"
          className="justify-center"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export interface ConfirmDialogProps
  extends Omit<PanelProps, "onCancel" | "titleId" | "className"> {
  open: boolean;
  /** Called on Cancel, Escape and backdrop click. */
  onClose: () => void;
  className?: string;
}

/**
 * Consequence-focused destructive confirmation dialog: compact centered card,
 * no header bar or X button — a deliberate speed bump with one clearly red
 * action. Closes on Escape and backdrop click; focuses Cancel on open.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  className,
  ...panel
}: ConfirmDialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const titleId = React.useId();

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
      aria-labelledby={titleId}
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop p-4 backdrop-blur-sm"
    >
      <ConfirmDialogPanel
        {...panel}
        onCancel={onClose}
        onConfirm={onConfirm}
        titleId={titleId}
        className={cn("animate-dialog-in", className)}
      />
    </div>,
    document.body,
  );
}
