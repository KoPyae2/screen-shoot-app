import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { CaptureResult } from "./types";

const CAPTURE_KINDS = ["fullscreen", "region", "window"] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

/** Fired on the main window whenever a new capture is ready to edit. */
export const onCaptureReady = (cb: (r: CaptureResult) => void): Promise<UnlistenFn> =>
  listen<CaptureResult>("capture-ready", (e) => cb(e.payload));

/** Fired by a global shortcut / tray to trigger a capture in the main window. */
export const onCaptureRequest = (
  cb: (kind: CaptureKind) => void,
): Promise<UnlistenFn> =>
  listen<string>("capture-request", (e) => {
    if ((CAPTURE_KINDS as readonly string[]).includes(e.payload)) {
      cb(e.payload as CaptureKind);
    }
  });

/** Fired whenever the history index changes (a capture was auto-stored). */
export const onHistoryChanged = (cb: () => void): Promise<UnlistenFn> =>
  listen("history-changed", () => cb());
