import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppWindow, RefreshCw, Search } from "lucide-react";
import { useCaptureStore } from "../../store/captureStore";
import { useCapture } from "../../hooks/useCapture";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WindowPicker({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { windows } = useCaptureStore();
  const { refreshWindows, window: captureWin } = useCapture();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
      refreshWindows();
    }
  }, [open, refreshWindows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return windows;
    return windows.filter(
      (w) =>
        w.title.toLowerCase().includes(q) || w.app_name.toLowerCase().includes(q),
    );
  }, [windows, query]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<AppWindow size={18} className="text-violet-500" />}
      title={t("capture.chooseWindow")}
      headerAside={
        <span className="ml-1 rounded-full bg-hover px-2 py-0.5 text-[11px] font-medium tabular-nums text-fg-muted">
          {windows.length}
        </span>
      }
    >
      {/* Search + refresh */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-sunken px-3 ring-1 ring-inset ring-hairline focus-within:ring-violet-500/50">
          <Search size={15} className="shrink-0 text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("capture.searchWindows")}
            className="h-9 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => refreshWindows()}
          aria-label={t("capture.refreshWindowList")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-fg-muted ring-1 ring-inset ring-hairline transition-colors hover:bg-hover hover:text-fg"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
            <AppWindow size={26} className="text-fg-subtle opacity-50" />
            <p className="text-sm text-fg-subtle">
              {windows.length === 0
                ? t("capture.noWindowsFound")
                : t("capture.noWindowsMatch", { query })}
            </p>
          </div>
        ) : (
          filtered.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                onClose();
                captureWin(w.id);
              }}
              className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-hover"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-500 ring-1 ring-inset ring-violet-500/20">
                <AppWindow size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{w.title}</p>
                <p className="truncate text-xs text-fg-subtle">
                  {w.app_name} · {w.width}×{w.height}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
