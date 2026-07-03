use image::RgbaImage;
use tauri::{AppHandle, Emitter, Manager};
use xcap::{Monitor, Window};

use crate::clipboard;
use crate::history;
use crate::imaging;
use crate::models::{CaptureResult, MonitorInfo, WindowInfo};

pub fn hide_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.hide();
    }
}

pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

pub fn monitor_to_rgba(m: &Monitor) -> Result<RgbaImage, String> {
    let img = m.capture_image().map_err(|e| e.to_string())?;
    let (w, h) = (img.width(), img.height());
    imaging::xcap_to_rgba(w, h, img.into_raw())
}

pub fn window_to_rgba(win: &Window) -> Result<RgbaImage, String> {
    let img = win.capture_image().map_err(|e| e.to_string())?;
    let (w, h) = (img.width(), img.height());
    imaging::xcap_to_rgba(w, h, img.into_raw())
}

/// Copy to clipboard, persist a session PNG, auto-store in history, and notify
/// the main window. Every capture is added to Recent automatically.
fn finalize(app: &AppHandle, img: RgbaImage) -> Result<CaptureResult, String> {
    let _ = clipboard::copy_rgba(app, &img);
    let cap = imaging::save_session_png(app, &img)?;
    let _ = history::store_image(app, &img, None, None);
    let _ = app.emit("capture-ready", &cap);
    let _ = app.emit("history-changed", ());
    Ok(cap)
}

#[tauri::command]
pub async fn list_monitors() -> Result<Vec<MonitorInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| -> Result<Vec<MonitorInfo>, String> {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        Ok(monitors
            .iter()
            .map(|m| MonitorInfo {
                id: m.id().unwrap_or(0),
                name: m.name().unwrap_or_default().to_string(),
                x: m.x().unwrap_or(0),
                y: m.y().unwrap_or(0),
                width: m.width().unwrap_or(0),
                height: m.height().unwrap_or(0),
                is_primary: m.is_primary().unwrap_or(false),
                scale_factor: m.scale_factor().unwrap_or(1.0),
            })
            .collect())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_windows() -> Result<Vec<WindowInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| -> Result<Vec<WindowInfo>, String> {
        let windows = Window::all().map_err(|e| e.to_string())?;
        Ok(windows
            .iter()
            .filter(|w| !w.title().unwrap_or_default().is_empty())
            .map(|w| WindowInfo {
                id: w.id().unwrap_or(0),
                title: w.title().unwrap_or_default().to_string(),
                app_name: w.app_name().unwrap_or_default().to_string(),
                x: w.x().unwrap_or(0),
                y: w.y().unwrap_or(0),
                width: w.width().unwrap_or(0),
                height: w.height().unwrap_or(0),
                is_minimized: w.is_minimized().unwrap_or(false),
            })
            .collect())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn capture_monitor(
    app: AppHandle,
    monitor_id: u32,
) -> Result<CaptureResult, String> {
    hide_main(&app);
    let img = tauri::async_runtime::spawn_blocking(move || -> Result<RgbaImage, String> {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        let m = monitors
            .into_iter()
            .find(|m| m.id().map(|i| i == monitor_id).unwrap_or(false))
            .ok_or_else(|| "monitor not found".to_string())?;
        monitor_to_rgba(&m)
    })
    .await
    .map_err(|e| e.to_string())?;
    show_main(&app);
    finalize(&app, img?)
}

#[tauri::command]
pub async fn capture_all_monitors(app: AppHandle) -> Result<Vec<CaptureResult>, String> {
    hide_main(&app);
    let imgs = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<RgbaImage>, String> {
        let monitors = Monitor::all().map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for m in monitors {
            out.push(monitor_to_rgba(&m)?);
        }
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())?;
    show_main(&app);
    let imgs = imgs?;
    let mut results = Vec::new();
    for (idx, img) in imgs.into_iter().enumerate() {
        if idx == 0 {
            let _ = clipboard::copy_rgba(&app, &img);
        }
        let cap = imaging::save_session_png(&app, &img)?;
        let _ = history::store_image(&app, &img, None, None);
        if idx == 0 {
            let _ = app.emit("capture-ready", &cap);
        }
        results.push(cap);
    }
    let _ = app.emit("history-changed", ());
    Ok(results)
}

#[tauri::command]
pub async fn capture_window(
    app: AppHandle,
    window_id: u32,
) -> Result<CaptureResult, String> {
    hide_main(&app);
    let img = tauri::async_runtime::spawn_blocking(move || -> Result<RgbaImage, String> {
        let windows = Window::all().map_err(|e| e.to_string())?;
        let w = windows
            .into_iter()
            .find(|w| w.id().map(|i| i == window_id).unwrap_or(false))
            .ok_or_else(|| "window not found".to_string())?;
        window_to_rgba(&w)
    })
    .await
    .map_err(|e| e.to_string())?;
    show_main(&app);
    finalize(&app, img?)
}

#[tauri::command]
pub async fn capture_active_window(app: AppHandle) -> Result<CaptureResult, String> {
    let target = foreground_window_id();
    hide_main(&app);
    let img = tauri::async_runtime::spawn_blocking(move || -> Result<RgbaImage, String> {
        let windows = Window::all().map_err(|e| e.to_string())?;
        let w = match target {
            Some(id) => windows.into_iter().find(|w| w.id().map(|i| i == id).unwrap_or(false)),
            None => windows
                .into_iter()
                .find(|w| !w.is_minimized().unwrap_or(true) && !w.title().unwrap_or_default().is_empty()),
        }
        .ok_or_else(|| "no active window found".to_string())?;
        window_to_rgba(&w)
    })
    .await
    .map_err(|e| e.to_string())?;
    show_main(&app);
    finalize(&app, img?)
}

#[cfg(windows)]
fn foreground_window_id() -> Option<u32> {
    use windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow;
    let hwnd = unsafe { GetForegroundWindow() };
    if hwnd.0.is_null() {
        None
    } else {
        Some(hwnd.0 as usize as u32)
    }
}

#[cfg(not(windows))]
fn foreground_window_id() -> Option<u32> {
    None
}
