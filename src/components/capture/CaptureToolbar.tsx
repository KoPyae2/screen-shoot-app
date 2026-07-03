import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, Square, AppWindow, Monitor as MonitorIcon, Layers } from "lucide-react";
import { useCapture } from "../../hooks/useCapture";
import { useCaptureStore } from "../../store/captureStore";
import { listMonitors } from "../../lib/commands";
import { Tooltip } from "../ui/Tooltip";
import { MonitorPicker } from "./MonitorPicker";
import { WindowPicker } from "./WindowPicker";

interface CaptureCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  hotkey?: string;
  onClick: () => void;
  disabled?: boolean;
}

function CaptureCard({ icon, title, subtitle, hotkey, onClick, disabled }: CaptureCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-xl border border-border bg-panel/80 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-panel-2 hover:shadow-cyan-glow disabled:pointer-events-none disabled:opacity-40"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-violet-500 transition-transform duration-200 group-hover:scale-110 group-hover:from-violet-500/30 group-hover:to-cyan-400/30">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>
      </div>
      {hotkey && (
        <span className="absolute right-3 top-3 rounded-md border border-border bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
          {hotkey}
        </span>
      )}
    </button>
  );
}

export function CaptureToolbar() {
  const { t } = useTranslation();
  const { busy } = useCaptureStore();
  const { fullscreen, region, allMonitors, activeWindow } = useCapture();
  const [showMonitors, setShowMonitors] = useState(false);
  const [showWindows, setShowWindows] = useState(false);

  const onFullscreen = async () => {
    const monitors = await listMonitors().catch(() => []);
    useCaptureStore.getState().setMonitors(monitors);
    if (monitors.length > 1) setShowMonitors(true);
    else fullscreen();
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <span className="h-2 w-2 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400" />
            {t("capture.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-subtle">
            {t("capture.description")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <CaptureCard
          icon={<Square size={22} />}
          title={t("capture.region")}
          subtitle={t("capture.regionDesc")}
          hotkey={t("capture.regionHotkey")}
          onClick={region}
          disabled={busy}
        />
        <CaptureCard
          icon={<Monitor size={22} />}
          title={t("capture.fullScreen")}
          subtitle={t("capture.fullScreenDesc")}
          hotkey={t("capture.fullScreenHotkey")}
          onClick={onFullscreen}
          disabled={busy}
        />
        <CaptureCard
          icon={<AppWindow size={22} />}
          title={t("capture.window")}
          subtitle={t("capture.windowDesc")}
          onClick={() => setShowWindows(true)}
          disabled={busy}
        />
        <CaptureCard
          icon={<AppWindow size={22} />}
          title={t("capture.activeWindow")}
          subtitle={t("capture.activeWindowDesc")}
          hotkey={t("capture.windowHotkey")}
          onClick={activeWindow}
          disabled={busy}
        />
        <CaptureCard
          icon={<Layers size={22} />}
          title={t("capture.allDisplays")}
          subtitle={t("capture.allDisplaysDesc")}
          onClick={allMonitors}
          disabled={busy}
        />
        <Tooltip label={t("capture.moreComingSoon")} className="block">
          <div className="flex h-full min-h-[132px] items-center justify-center rounded-xl border border-dashed border-border-soft text-xs text-fg-subtle">
            <MonitorIcon size={16} className="mr-1.5 opacity-50" /> {t("capture.moreSoon")}
          </div>
        </Tooltip>
      </div>

      <MonitorPicker open={showMonitors} onClose={() => setShowMonitors(false)} />
      <WindowPicker open={showWindows} onClose={() => setShowWindows(false)} />
    </div>
  );
}
