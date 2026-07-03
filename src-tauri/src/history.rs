use std::path::PathBuf;

use image::RgbaImage;
use tauri::AppHandle;

use crate::imaging;
use crate::models::HistoryEntry;

fn index_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(imaging::history_dir(app)?.join("index.json"))
}

fn read_index(app: &AppHandle) -> Result<Vec<HistoryEntry>, String> {
    let path = index_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(serde_json::from_str(&data).unwrap_or_default())
}

fn write_index(app: &AppHandle, entries: &[HistoryEntry]) -> Result<(), String> {
    let path = index_path(app)?;
    let data = serde_json::to_string_pretty(entries).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

/// Persist an image into history (full PNG + thumbnail) and prepend an index
/// entry. `full_png` may be supplied to avoid re-encoding the full image.
pub fn store_image(
    app: &AppHandle,
    img: &RgbaImage,
    full_png: Option<&[u8]>,
    note: Option<String>,
) -> Result<HistoryEntry, String> {
    let dir = imaging::history_dir(app)?;
    let id = uuid::Uuid::new_v4().to_string();

    let full_path = dir.join(format!("{id}.png"));
    match full_png {
        Some(bytes) => std::fs::write(&full_path, bytes).map_err(|e| e.to_string())?,
        None => std::fs::write(&full_path, imaging::encode_png_fast(img)?)
            .map_err(|e| e.to_string())?,
    }

    let thumb = imaging::thumbnail(img, 400);
    let thumb_path = dir.join(format!("{id}_thumb.png"));
    std::fs::write(&thumb_path, imaging::encode_png_fast(&thumb)?).map_err(|e| e.to_string())?;

    let entry = HistoryEntry {
        id,
        path: full_path.to_string_lossy().to_string(),
        thumb: thumb_path.to_string_lossy().to_string(),
        width: img.width(),
        height: img.height(),
        created_at: chrono::Local::now().to_rfc3339(),
        note,
    };

    let mut entries = read_index(app)?;
    entries.insert(0, entry.clone());
    write_index(app, &entries)?;
    Ok(entry)
}

#[tauri::command]
pub async fn history_list(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    read_index(&app)
}

#[tauri::command]
pub async fn history_delete(app: AppHandle, id: String) -> Result<(), String> {
    let mut entries = read_index(&app)?;
    if let Some(pos) = entries.iter().position(|e| e.id == id) {
        let entry = entries.remove(pos);
        let _ = std::fs::remove_file(&entry.path);
        let _ = std::fs::remove_file(&entry.thumb);
    }
    write_index(&app, &entries)
}

#[tauri::command]
pub async fn history_clear(app: AppHandle) -> Result<(), String> {
    let entries = read_index(&app)?;
    for entry in &entries {
        let _ = std::fs::remove_file(&entry.path);
        let _ = std::fs::remove_file(&entry.thumb);
    }
    write_index(&app, &[])
}
