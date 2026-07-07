import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History, Trash } from "lucide-react";
import { useHistoryStore } from "../../store/historyStore";
import type { CaptureResult } from "../../lib/types";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Thumbnail } from "./Thumbnail";

interface Props {
  onOpen: (capture: CaptureResult) => void;
}

export function HistoryPanel({ onOpen }: Props) {
  const { t } = useTranslation();
  const entries = useHistoryStore((s) => s.entries);
  const refresh = useHistoryStore((s) => s.refresh);
  const remove = useHistoryStore((s) => s.remove);
  const clear = useHistoryStore((s) => s.clear);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-fg-muted" />
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400" />
          <h2 className="text-sm font-semibold">{t("sidebar.recent")}</h2>
          {entries.length > 0 && (
            <span className="rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] text-fg-subtle">
              {entries.length}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-fg-subtle hover:text-danger"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash size={14} /> {t("sidebar.clear")}
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-4">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/10 to-cyan-400/10">
              <History size={22} className="text-violet-400/60" />
            </div>
            <p className="text-sm text-fg-muted">
              {t("sidebar.noScreenshots")}
              <br />
              {t("sidebar.yourCapturesWillAppear")}
            </p>
          </div>
        ) : (
          entries.map((entry) => (
            <Thumbnail
              key={entry.id}
              entry={entry}
              onOpen={() =>
                onOpen({
                  id: entry.id,
                  path: entry.path,
                  width: entry.width,
                  height: entry.height,
                })
              }
              onDelete={() => remove(entry.id)}
            />
          ))
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await clear();
        }}
        title={t("sidebar.clearAllConfirm")}
        description={t("sidebar.clearAllConfirmDesc")}
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium tabular-nums text-danger">
            <Trash size={12} />
            {t("sidebar.captureCount", { count: entries.length })}
          </span>
        }
        cancelLabel={t("ui.cancel")}
        confirmLabel={t("sidebar.clear")}
      />
    </div>
  );
}
