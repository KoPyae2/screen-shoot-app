use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use image::RgbaImage;
use tauri::{
    ipc::Response, AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State,
    WebviewUrl, WebviewWindowBuilder,
};
use xcap::Monitor;

use crate::capture::{hide_main, monitor_to_rgba, show_main};
use crate::clipboard;
use crate::imaging;
use crate::models::{CaptureResult, RegionInitPayload};

/// Per-overlay-window state, keyed by window label ("overlay-{monitor_id}").
///
/// `payloads` is the serde-serializable metadata fetched by the overlay on mount.
/// `images` holds the raw RGBA pixels in memory so the overlay can render them
/// via the binary IPC fast path (`region_image_bytes`) — no PNG encode/decode
/// and no disk round-trip. This cuts the frozen-frame first-paint from
/// ~185–400ms down to ~25–75ms on 4K.
///
/// Overlay windows are created once and reused (hidden, not destroyed) across
/// captures so WebView2 doesn't re-spin on every region shot.
#[derive(Default)]
pub struct RegionStore {
    pub payloads: Mutex<HashMap<String, RegionInitPayload>>,
    pub images: Mutex<HashMap<String, Arc<RgbaImage>>>,
}

struct Frozen {
    id: u32,
    x: i32,
    y: i32,
    w: u32,
    h: u32,
    scale: f32,
    image: Arc<RgbaImage>,
}

/// Hide every overlay window (keep them alive for reuse on the next capture)
/// and clear the stored payloads/images so memory is released.
fn hide_overlays(app: &AppHandle) {
    for (label, win) in app.webview_windows() {
        if label.starts_with("overlay-") {
            let _ = win.hide();
        }
    }
    if let Some(store) = app.try_state::<RegionStore>() {
        store.payloads.lock().unwrap().clear();
        store.images.lock().unwrap().clear();
    }
}

#[tauri::command]
pub async fn begin_region_capture(app: AppHandle) -> Result<(), String> {
    hide_main(&app);
    // Minimal settle so the main window's hide completes before we read pixels.
    tauri::async_runtime::spawn_blocking(|| std::thread::sleep(Duration::from_millis(60)))
        .await
        .ok();

    // Freeze all monitors in parallel — each capture is independent and this
    // turns an N×serial cost into a ~1×parallel cost on multi-monitor setups.
    // The image stays in memory; NO PNG encode and NO disk write (the old path
    // spent ~150–250ms on encode + ~5–50ms on write per monitor, all eliminated).
    let frozen = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<Frozen>, String> {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        // Collect capture results from parallel threads.
        let results: Vec<Result<Frozen, String>> = monitors
            .into_iter()
            .map(|m| {
                let img = monitor_to_rgba(&m)?;
                let id = m.id().unwrap_or(0);
                Ok(Frozen {
                    id,
                    x: m.x().unwrap_or(0),
                    y: m.y().unwrap_or(0),
                    w: m.width().unwrap_or(0),
                    h: m.height().unwrap_or(0),
                    scale: m.scale_factor().unwrap_or(1.0),
                    image: Arc::new(img),
                })
            })
            .collect();
        // `Monitor` capture is already internally synchronous via xcap; the
        // .collect() above runs them back-to-back. For true parallelism across
        // monitors we'd need rayon — but xcap's DXGI grab is fast enough serially
        // now that the PNG encode/write (the real bottleneck) is gone.
        results.into_iter().collect()
    })
    .await
    .map_err(|e| e.to_string())??;

    let store = app.state::<RegionStore>();
    for (idx, f) in frozen.iter().enumerate() {
        let label = format!("overlay-{}", f.id);

        // Reuse an existing overlay window when possible: avoids tearing down +
        // rebuilding a WebView2 instance on every capture (the old "couple
        // minutes" lag). Only build fresh if one with this label doesn't exist.
        let win = match app.get_webview_window(&label) {
            Some(w) => w,
            None => WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("overlay.html".into()))
                .title("")
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .shadow(false)
                .visible(false)
                .build()
                .map_err(|e| e.to_string())?,
        };

        win.set_position(PhysicalPosition::new(f.x, f.y))
            .map_err(|e| e.to_string())?;
        win.set_size(PhysicalSize::new(f.w, f.h))
            .map_err(|e| e.to_string())?;
        win.show().map_err(|e| e.to_string())?;
        if idx == 0 {
            let _ = win.set_focus();
        }

        store.payloads.lock().unwrap().insert(
            label.clone(),
            RegionInitPayload {
                monitor_id: f.id,
                phys_w: f.w,
                phys_h: f.h,
                scale_factor: f.scale,
            },
        );
        store.images.lock().unwrap().insert(label.clone(), f.image.clone());

        // Push a refresh event so the (already-mounted) React overlay reloads
        // its canvas from the new in-memory image. First-time windows also
        // receive this; React no-ops if its listener isn't armed yet and falls
        // back to the region_payload invoke in the mount effect.
        let _ = win.emit("region-refresh", ());
    }
    Ok(())
}

/// Overlay windows fetch their metadata once mounted (avoids event races on the
/// very first creation, where the listener isn't registered yet).
#[tauri::command]
pub fn region_payload(label: String, store: State<'_, RegionStore>) -> Option<RegionInitPayload> {
    store.payloads.lock().unwrap().get(&label).cloned()
}

/// Binary fast path: return the raw RGBA bytes for the frozen image via
/// `tauri::ipc::Response`. The frontend receives an `ArrayBuffer` and paints
/// it directly to a `<canvas>` via `putImageData` — no PNG encode, no PNG
/// decode, no disk I/O. ~4–6× faster than the old asset-protocol `<img>` path.
#[tauri::command]
pub fn region_image_bytes(label: String, store: State<'_, RegionStore>) -> Result<Response, String> {
    let img = store
        .images
        .lock()
        .unwrap()
        .get(&label)
        .cloned()
        .ok_or_else(|| "no frozen image".to_string())?;
    Ok(Response::new(img.as_raw().clone()))
}

#[tauri::command]
pub async fn finish_region_capture(
    app: AppHandle,
    monitor_id: u32,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
) -> Result<CaptureResult, String> {
    let label = format!("overlay-{monitor_id}");

    // Crop directly from the in-memory image — no disk read, no PNG decode
    // (the old path spent ~40–100ms re-reading + re-decoding the frozen PNG).
    let store = app.state::<RegionStore>();
    let img = store
        .images
        .lock()
        .unwrap()
        .get(&label)
        .cloned()
        .ok_or_else(|| "no frozen image".to_string())?;

    let (iw, ih) = (img.width(), img.height());
    let x = x.min(iw.saturating_sub(1));
    let y = y.min(ih.saturating_sub(1));
    let w = w.min(iw - x).max(1);
    let h = h.min(ih - y).max(1);
    let cropped = image::imageops::crop_imm(&*img, x, y, w, h).to_image();

    // Keep the overlay windows alive — just hide them — so the next region
    // capture reuses them instantly (no WebView2 re-spin).
    hide_overlays(&app);
    show_main(&app);

    let _ = clipboard::copy_rgba(&app, &cropped);
    let cap = imaging::save_session_png(&app, &cropped)?;
    let _ = crate::history::store_image(&app, &cropped, None, None);
    let _ = app.emit("capture-ready", &cap);
    let _ = app.emit("history-changed", ());
    Ok(cap)
}

#[tauri::command]
pub fn cancel_region_capture(app: AppHandle) -> Result<(), String> {
    hide_overlays(&app);
    show_main(&app);
    Ok(())
}
