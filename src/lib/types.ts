// Mirrors of the serde structs returned by the Rust backend.

export interface MonitorInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_primary: boolean;
  scale_factor: number;
}

export interface WindowInfo {
  id: number;
  title: string;
  app_name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_minimized: boolean;
}

export interface CaptureResult {
  id: string;
  path: string;
  width: number;
  height: number;
}

export interface HistoryEntry {
  id: string;
  path: string;
  thumb: string;
  width: number;
  height: number;
  created_at: string;
}

/** Metadata for the frozen frame shown by a region overlay window. */
export interface RegionInitPayload {
  monitor_id: number;
  phys_w: number;
  phys_h: number;
  scale_factor: number;
}
