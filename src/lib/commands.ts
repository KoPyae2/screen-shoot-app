import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type {
  CaptureResult,
  HistoryEntry,
  MonitorInfo,
  RegionInitPayload,
  WindowInfo,
} from "./types";

/** Turn a filesystem path returned by the backend into an asset-protocol URL. */
export function assetUrl(path: string): string {
  return convertFileSrc(path);
}

export const listMonitors = () => invoke<MonitorInfo[]>("list_monitors");
export const listWindows = () => invoke<WindowInfo[]>("list_windows");

export const captureMonitor = (monitorId: number) =>
  invoke<CaptureResult>("capture_monitor", { monitorId });

export const captureAllMonitors = () =>
  invoke<CaptureResult[]>("capture_all_monitors");

export const captureWindow = (windowId: number) =>
  invoke<CaptureResult>("capture_window", { windowId });

export const captureActiveWindow = () =>
  invoke<CaptureResult>("capture_active_window");

export const beginRegionCapture = () => invoke<void>("begin_region_capture");
export const finishRegionCapture = (
  monitorId: number,
  x: number,
  y: number,
  w: number,
  h: number,
) => invoke<CaptureResult>("finish_region_capture", { monitorId, x, y, w, h });
export const cancelRegionCapture = () => invoke<void>("cancel_region_capture");

/** Metadata for the frozen frame shown by a region overlay window. */
export const regionPayload = (label: string) =>
  invoke<RegionInitPayload | null>("region_payload", { label });

/** Raw RGBA bytes of the frozen frame (binary IPC fast path). */
export const regionImageBytes = (label: string) =>
  invoke<ArrayBuffer>("region_image_bytes", { label });

/** Load a capture as a base64 data URL (keeps the editor canvas untainted). */
export const readImageDataUrl = (path: string) =>
  invoke<string>("read_image_data_url", { path });

export const copyBytesToClipboard = (b64: string) =>
  invoke<void>("copy_bytes_to_clipboard", { b64 });

/**
 * Save an image via a Rust-side native dialog (the webview never picks
 * filesystem paths). Returns the saved path, or null if the user cancelled.
 * Dialog strings are passed in so they stay localized.
 */
export const saveImageBytes = (
  b64: string,
  quality: number,
  labels: { title: string; defaultName: string; pngLabel: string; jpegLabel: string },
) =>
  invoke<string | null>("save_image_bytes", {
    b64,
    quality,
    title: labels.title,
    defaultName: labels.defaultName,
    pngLabel: labels.pngLabel,
    jpegLabel: labels.jpegLabel,
  });

export const historyList = () => invoke<HistoryEntry[]>("history_list");
export const historyDelete = (id: string) =>
  invoke<void>("history_delete", { id });
export const historyClear = () => invoke<void>("history_clear");

/** Names of global shortcuts that failed to register at startup. */
export const failedShortcuts = () => invoke<string[]>("failed_shortcuts");
