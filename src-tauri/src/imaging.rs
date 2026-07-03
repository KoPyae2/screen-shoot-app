use std::io::Cursor;
use std::path::PathBuf;

use image::{DynamicImage, ImageBuffer, Rgba, RgbaImage};
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

pub fn encode_png(img: &RgbaImage) -> Result<Vec<u8>, String> {
    let mut buf = Vec::new();
    DynamicImage::ImageRgba8(img.clone())
        .write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(buf)
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
    let rgb = DynamicImage::ImageRgba8(img.clone()).to_rgb8();
    let mut buf = Vec::new();
    {
        let mut cursor = Cursor::new(&mut buf);
        let mut encoder =
            image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, quality);
        encoder
            .encode_image(&DynamicImage::ImageRgb8(rgb))
            .map_err(|e| e.to_string())?;
    }   Ok(buf)
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
    DynamicImage::ImageRgba8(img.clone())
        .thumbnail(max, max)
        .to_rgba8()
}

/// Write an RGBA image as a PNG into the sessions dir and return a CaptureResult.
pub fn save_session_png(app: &AppHandle, img: &RgbaImage) -> Result<CaptureResult, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let dir = sessions_dir(app)?;
    let path = dir.join(format!("{id}.png"));
    let bytes = encode_png_fast(img)?;
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    Ok(CaptureResult {
        id,
        path: path.to_string_lossy().to_string(),
        width: img.width(),
        height: img.height(),
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

/// Read an image file and return it as a base64 `data:` URL. Loading the editor's
/// base image this way (instead of the asset protocol) keeps the canvas untainted
/// so `toDataURL()` export works.
#[tauri::command]
pub async fn read_image_data_url(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{b64}"))
}
