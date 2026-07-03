import * as React from "react";
import { create } from "zustand";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../../lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let counter = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = counter++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push("success", m),
  error: (m: string) => useToastStore.getState().push("error", m),
  info: (m: string) => useToastStore.getState().push("info", m),
};

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-accent" />,
  error: <AlertCircle size={18} className="text-danger" />,
  info: <Info size={18} className="text-brand" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-bg-elevated/95 px-4 py-3 text-sm text-fg shadow-panel backdrop-blur animate-fade-in",
          )}
        >
          {icons[t.kind]}
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-1 text-fg-subtle transition-colors hover:text-fg"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
