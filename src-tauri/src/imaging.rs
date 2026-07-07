use std::io::Cursor;
use std::path::PathBuf;

use image::{ImageBuffer, Rgba, RgbaImage};
use tauri::{AppHandle, Manager};

use crate::models::CaptureResult;

/// Directory for transient session captures (app cache dir).
pub fn sessions_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("sessions");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Directory for persisted history (app data dir).
pub fn history_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("history");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Bridge an xcap RgbaImage (whatever internal `image` version it uses) into this
/// crate's `image::RgbaImage` by round-tripping through raw RGBA bytes.
pub fn xcap_to_rgba(width: u32, height: u32, raw: Vec<u8>) -> Result<RgbaImage, String> {
    ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(width, height, raw)
        .ok_or_else(|| "buffer size does not match dimensions".to_string())
}

/// Fast PNG encode (low compression) for transient images — session captures,
/// frozen overlays, thumbnails. Cuts encode time dramatically on large screens
/// where the default (slow) compression would take many seconds.
pub fn encode_png_fast(img: &RgbaImage) -> Result<Vec<u8>, String> {
    use image::codecs::png::{CompressionType, FilterType, PngEncoder};
    use image::ImageEncoder;
    let mut buf = Vec::new();
    {
        let cursor = Cursor::new(&mut buf);
        let encoder =
            PngEncoder::new_with_quality(cursor, CompressionType::Fast, FilterType::NoFilter);
        encoder
            .write_image(
                img.as_raw(),
                img.width(),
                img.height(),
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(buf)
}

pub fn encode_jpg(img: &RgbaImage, quality: u8) -> Result<Vec<u8>, String> {
    use image::ImageEncoder;
    // Strip alpha without cloning the full RGBA buffer into a DynamicImage.
    let mut rgb = Vec::with_capacity((img.width() as usize) * (img.height() as usize) * 3);
    for px in img.pixels() {
        rgb.extend_from_slice(&px.0[..3]);
    }
    let mut buf = Vec::new();
    let encoder =
        image::codecs::jpeg::JpegEncoder::new_with_quality(Cursor::new(&mut buf), quality);
    encoder
        .write_image(
            &rgb,
            img.width(),
            img.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

pub fn decode_bytes(bytes: &[u8]) -> Result<RgbaImage, String> {
    Ok(image::load_from_memory(bytes)
        .map_err(|e| e.to_string())?
        .to_rgba8())
}

/// Downscale to fit within `max` on the longest side, preserving aspect ratio.
pub fn thumbnail(img: &RgbaImage, max: u32) -> RgbaImage {
    let (w, h) = (img.width(), img.height());
    if w <= max && h <= max {
        return img.clone();
    }
    let ratio = (max as f32 / w as f32).min(max as f32 / h as f32);
    let nw = ((w as f32 * ratio).round() as u32).max(1);
    let nh = ((h as f32 * ratio).round() as u32).max(1);
    image::imageops::thumbnail(img, nw, nh)
}

/// Write pre-encoded PNG bytes into the sessions dir and return a CaptureResult.
/// Callers encode once and reuse the same bytes for history storage.
pub fn save_session_png_bytes(
    app: &AppHandle,
    bytes: &[u8],
    width: u32,
    height: u32,
) -> Result<CaptureResult, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let dir = sessions_dir(app)?;
    let path = dir.join(format!("{id}.png"));
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(CaptureResult {
        id,
        path: path.to_string_lossy().to_string(),
        width,
        height,
    })
}

/// Remove leftover session files from previous runs.
pub fn clean_sessions(app: &AppHandle) {
    if let Ok(dir) = sessions_dir(app) {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let _ = std::fs::remove_file(entry.path());
            }
        }
    }
}

/// Read a capture image and return it as a base64 `data:` URL. Loading the
/// editor's base image this way (instead of the asset protocol) keeps the
/// canvas untainted so `toDataURL()` export works.
///
/// The path comes from the webview, so it is confined to the app's own
/// session/history directories — this command must not be a general
/// file-read primitive.
#[tauri::command]
pub async fn read_image_data_url(app: AppHandle, path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let requested = std::fs::canonicalize(&path).map_err(|e| e.to_string())?;
    let allowed = [sessions_dir(&app)?, history_dir(&app)?];
    let permitted = allowed.iter().any(|dir| {
        std::fs::canonicalize(dir)
            .map(|d| requested.starts_with(&d))
            .unwrap_or(false)
    });
    if !permitted {
        return Err("path is outside the app's capture directories".into());
    }
    let bytes = std::fs::read(&requested).map_err(|e| e.to_string())?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{b64}"))
}
