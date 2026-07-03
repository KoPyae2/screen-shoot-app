import { create } from "zustand";
import type { CaptureResult, MonitorInfo, WindowInfo } from "../lib/types";

export type CaptureMode = "fullscreen" | "region" | "window" | "all";

interface CaptureState {
  busy: boolean;
  monitors: MonitorInfo[];
  windows: WindowInfo[];
  current: CaptureResult | null;

  setBusy: (b: boolean) => void;
  setMonitors: (m: MonitorInfo[]) => void;
  setWindows: (w: WindowInfo[]) => void;
  setCurrent: (c: CaptureResult | null) => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  busy: false,
  monitors: [],
  windows: [],
  current: null,

  setBusy: (busy) => set({ busy }),
  setMonitors: (monitors) => set({ monitors }),
  setWindows: (windows) => set({ windows }),
  setCurrent: (current) => set({ current }),
}));
