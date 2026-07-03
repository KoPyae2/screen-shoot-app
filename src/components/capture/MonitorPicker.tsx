import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Monitor } from "lucide-react";
import { useCaptureStore } from "../../store/captureStore";
import { useCapture } from "../../hooks/useCapture";
import { listMonitors } from "../../lib/commands";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MonitorPicker({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { monitors, setMonitors } = useCaptureStore();
  const { fullscreen } = useCapture();

  useEffect(() => {
    if (open) listMonitors().then(setMonitors).catch(() => {});
  }, [open, setMonitors]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Monitor size={18} className="text-violet-500" />}
      title={t("capture.chooseDisplay")}
    >
      <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4">
        {monitors.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              onClose();
              fullscreen(m.id);
            }}
            className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-panel p-4 text-left transition-all hover:border-cyan-400/40 hover:bg-panel-2 hover:shadow-cyan-glow"
          >
            <div className="flex w-full items-center justify-between">
              <Monitor size={20} className="text-fg-muted group-hover:text-violet-500" />
              {m.is_primary && (
                <span className="rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-400/20 px-2 py-0.5 text-[10px] font-medium text-violet-500">
                  {t("capture.primary")}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-fg">{m.name || `Display ${m.id}`}</p>
            <p className="text-xs text-fg-subtle">
              {m.width}×{m.height} · {Math.round(m.scale_factor * 100)}%
            </p>
          </button>
        ))}
      </div>
    </Modal>
  );
}
