use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::RgbaImage;
use tauri::image::Image;
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::imaging;

/// Write an RGBA image to the system clipboard (as a bitmap).
pub fn copy_rgba(app: &AppHandle, img: &RgbaImage) -> Result<(), String> {
    let (w, h) = (img.width(), img.height());
    let raw = img.clone().into_raw();
    let ti = Image::new_owned(raw, w, h);
    app.clipboard().write_image(&ti).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_image_to_clipboard(app: AppHandle, path: String) -> Result<(), String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let img = imaging::decode_bytes(&bytes)?;
    copy_rgba(&app, &img)
}

/// Copy an edited image from the frontend. `b64` is a base64-encoded PNG —
/// far cheaper over IPC than a JSON number array.
#[tauri::command]
pub async fn copy_bytes_to_clipboard(app: AppHandle, b64: String) -> Result<(), String> {
    let bytes = STANDARD.decode(b64.as_bytes()).map_err(|e| e.to_string())?;
    let img = imaging::decode_bytes(&bytes)?;
    copy_rgba(&app, &img)
}
