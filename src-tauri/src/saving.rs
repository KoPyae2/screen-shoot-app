use base64::{engine::general_purpose::STANDARD, Engine as _};

use crate::imaging;

/// Persist an edited image to a user-chosen path. `b64` is a base64-encoded PNG
/// from the frontend; we re-encode to the requested format. `quality` applies to
/// JPEG (1-100). Using base64 (not a JSON number array) keeps large images fast.
#[tauri::command]
pub async fn save_image_bytes(
    dest_path: String,
    b64: String,
    format: String,
    quality: u8,
) -> Result<(), String> {
    let bytes = STANDARD.decode(b64.as_bytes()).map_err(|e| e.to_string())?;
    let img = imaging::decode_bytes(&bytes)?;
    let out = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => imaging::encode_jpg(&img, quality.clamp(1, 100))?,
        _ => imaging::encode_png(&img)?,
    };
    std::fs::write(&dest_path, &out).map_err(|e| e.to_string())?;
    Ok(())
}
