use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::imaging;

/// Ask the user where to save via a native dialog and write the image there.
/// The dialog runs Rust-side so the webview never gets to pick filesystem
/// paths (an arbitrary-write primitive). `b64` is a base64-encoded PNG from
/// the frontend; dialog strings are passed in so they stay localized.
/// Returns the saved path, or `None` if the user cancelled.
#[tauri::command]
pub async fn save_image_bytes(
    app: AppHandle,
    b64: String,
    quality: u8,
    title: String,
    default_name: String,
    png_label: String,
    jpeg_label: String,
) -> Result<Option<String>, String> {
    let Some(path) = app
        .dialog()
        .file()
        .set_title(&title)
        .set_file_name(&default_name)
        .add_filter(&png_label, &["png"])
        .add_filter(&jpeg_label, &["jpg", "jpeg"])
        .blocking_save_file()
        .and_then(|p| p.into_path().ok())
    else {
        return Ok(None);
    };

    let bytes = STANDARD.decode(b64.as_bytes()).map_err(|e| e.to_string())?;
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_ascii_lowercase();
    let out = match ext.as_str() {
        "jpg" | "jpeg" => {
            let img = imaging::decode_bytes(&bytes)?;
            imaging::encode_jpg(&img, quality.clamp(1, 100))?
        }
        // The canvas already produced PNG bytes — write them through unchanged
        // instead of paying a decode + slow re-encode for an identical result.
        _ => bytes,
    };
    std::fs::write(&path, &out).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}
