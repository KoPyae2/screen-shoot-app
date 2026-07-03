import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { CaptureResult, RegionInitPayload } from "./types";

/** Fired on the main window whenever a new capture is ready to edit. */
export const onCaptureReady = (cb: (r: CaptureResult) => void): Promise<UnlistenFn> =>
  listen<CaptureResult>("capture-ready", (e) => cb(e.payload));

/** Fired on an overlay window with the frozen screenshot for that monitor. */
export const onRegionInit = (cb: (p: RegionInitPayload) => void): Promise<UnlistenFn> =>
  listen<RegionInitPayload>("region-init", (e) => cb(e.payload));

/** Fired by a global shortcut / tray to trigger a capture in the main window. */
export const onCaptureRequest = (
  cb: (kind: "fullscreen" | "region" | "window") => void,
): Promise<UnlistenFn> =>
  listen<string>("capture-request", (e) =>
    cb(e.payload as "fullscreen" | "region" | "window"),
  );

/** Fired whenever the history index changes (a capture was auto-stored). */
export const onHistoryChanged = (cb: () => void): Promise<UnlistenFn> =>
  listen("history-changed", () => cb());
