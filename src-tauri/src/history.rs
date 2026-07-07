use std::path::PathBuf;
use std::sync::Mutex;

use image::RgbaImage;
use tauri::AppHandle;

use crate::imaging;
use crate::models::HistoryEntry;

/// Serializes every read-modify-write of `index.json`. Tauri async commands
/// run concurrently, so a capture landing while a delete/clear is in flight
/// would otherwise interleave and silently lose entries.
static INDEX_LOCK: Mutex<()> = Mutex::new(());

fn lock_index() -> std::sync::MutexGuard<'static, ()> {
    INDEX_LOCK.lock().unwrap_or_else(|e| e.into_inner())
}

fn index_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(imaging::history_dir(app)?.join("index.json"))
}

fn read_index(app: &AppHandle) -> Result<Vec<HistoryEntry>, String> {
    let path = index_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    match serde_json::from_str(&data) {
        Ok(entries) => Ok(entries),
        Err(e) => {
            // A truncated/corrupt index must not be silently treated as empty:
            // the next write would overwrite it and orphan every stored image.
            // Keep a backup so the user's history is recoverable.
            let _ = std::fs::copy(&path, path.with_extension("json.corrupt"));
            eprintln!("history index is corrupt ({e}); backed it up and starting fresh");
            Ok(Vec::new())
        }
    }
}

/// Atomic write: write to a temp file, then rename over the index so a crash
/// mid-write can never leave a truncated `index.json` behind.
fn write_index(app: &AppHandle, entries: &[HistoryEntry]) -> Result<(), String> {
    let path = index_path(app)?;
    let tmp = path.with_extension("json.tmp");
    let data = serde_json::to_string_pretty(entries).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, data).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

/// Persist an image into history (full PNG + thumbnail) and prepend an index
/// entry. `full_png` may be supplied to avoid re-encoding the full image.
pub fn store_image(
    app: &AppHandle,
    img: &RgbaImage,
    full_png: Option<&[u8]>,
) -> Result<HistoryEntry, String> {
    let dir = imaging::history_dir(app)?;
    let id = uuid::Uuid::new_v4().to_string();

    let full_path = dir.join(format!("{id}.png"));
    match full_png {
        Some(bytes) => std::fs::write(&full_path, bytes).map_err(|e| e.to_string())?,
        None => {
            std::fs::write(&full_path, imaging::encode_png_fast(img)?).map_err(|e| e.to_string())?
        }
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
    };

    let _guard = lock_index();
    let mut entries = read_index(app)?;
    entries.insert(0, entry.clone());
    write_index(app, &entries)?;
    Ok(entry)
}

#[tauri::command]
pub async fn history_list(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    let _guard = lock_index();
    read_index(&app)
}

#[tauri::command]
pub async fn history_delete(app: AppHandle, id: String) -> Result<(), String> {
    let _guard = lock_index();
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
    let _guard = lock_index();
    let entries = read_index(&app)?;
    for entry in &entries {
        let _ = std::fs::remove_file(&entry.path);
        let _ = std::fs::remove_file(&entry.thumb);
    }
    write_index(&app, &[])
}
