import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type {
  CaptureResult,
  HistoryEntry,
  ImageFormat,
  MonitorInfo,
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

export const copyImageToClipboard = (path: string) =>
  invoke<void>("copy_image_to_clipboard", { path });

/** Load an image file as a base64 data URL (keeps the editor canvas untainted). */
export const readImageDataUrl = (path: string) =>
  invoke<string>("read_image_data_url", { path });

export const copyBytesToClipboard = (b64: string) =>
  invoke<void>("copy_bytes_to_clipboard", { b64 });

export const saveImageBytes = (
  destPath: string,
  b64: string,
  format: ImageFormat,
  quality: number,
) => invoke<void>("save_image_bytes", { destPath, b64, format, quality });

export const historyList = () => invoke<HistoryEntry[]>("history_list");
export const historyDelete = (id: string) =>
  invoke<void>("history_delete", { id });
export const historyClear = () => invoke<void>("history_clear");
