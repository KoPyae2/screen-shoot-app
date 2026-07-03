use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct MonitorInfo {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub scale_factor: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_minimized: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct CaptureResult {
    pub id: String,
    pub path: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct RegionInitPayload {
    pub monitor_id: u32,
    pub phys_w: u32,
    pub phys_h: u32,
    pub scale_factor: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub path: String,
    pub thumb: String,
    pub width: u32,
    pub height: u32,
    pub created_at: String,
    pub note: Option<String>,
}
