import { create } from "zustand";
import type { MonitorInfo, WindowInfo } from "../lib/types";

interface CaptureState {
  busy: boolean;
  monitors: MonitorInfo[];
  windows: WindowInfo[];

  setBusy: (b: boolean) => void;
  setMonitors: (m: MonitorInfo[]) => void;
  setWindows: (w: WindowInfo[]) => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  busy: false,
  monitors: [],
  windows: [],

  setBusy: (busy) => set({ busy }),
  setMonitors: (monitors) => set({ monitors }),
  setWindows: (windows) => set({ windows }),
}));
