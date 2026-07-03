import { useCallback } from "react";
import i18n from "../i18n/i18n";
import {
  beginRegionCapture,
  captureActiveWindow,
  captureAllMonitors,
  captureMonitor,
  captureWindow,
  listMonitors,
  listWindows,
} from "../lib/commands";
import { useCaptureStore } from "../store/captureStore";
import { toast } from "../components/ui/Toast";

/** Central capture orchestration: busy state + error handling. */
export function useCapture() {
  const { setBusy } = useCaptureStore();

  const fullscreen = useCallback(
    async (monitorId?: number) => {
      setBusy(true);
      try {
        const monitors = monitorId != null ? null : await listMonitors();
        const id = monitorId ?? monitors?.find((m) => m.is_primary)?.id ?? monitors?.[0]?.id;
        if (id == null) throw new Error("No monitor found");
        await captureMonitor(id);
        toast.success(i18n.t("toast.screenCaptured"));
      } catch (e) {
        toast.error(String(e));
      } finally {
        setBusy(false);
      }
    },
    [setBusy],
  );

  const allMonitors = useCallback(async () => {
    setBusy(true);
    try {
      await captureAllMonitors();
      toast.success(i18n.t("toast.allMonitorsCaptured"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }, [setBusy]);

  const region = useCallback(async () => {
    setBusy(true);
    try {
      await beginRegionCapture();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }, [setBusy]);

  const window = useCallback(
    async (windowId: number) => {
      setBusy(true);
      try {
        await captureWindow(windowId);
        toast.success(i18n.t("toast.windowCaptured"));
      } catch (e) {
        toast.error(String(e));
      } finally {
        setBusy(false);
      }
    },
    [setBusy],
  );

  const activeWindow = useCallback(async () => {
    setBusy(true);
    try {
      await captureActiveWindow();
      toast.success(i18n.t("toast.activeWindowCaptured"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  }, [setBusy]);

  const refreshWindows = useCallback(async () => {
    try {
      useCaptureStore.getState().setWindows(await listWindows());
    } catch (e) {
      toast.error(String(e));
    }
  }, []);

  return { fullscreen, allMonitors, region, window, activeWindow, refreshWindows };
}
