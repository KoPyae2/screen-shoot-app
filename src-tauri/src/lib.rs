mod capture;
mod clipboard;
mod history;
mod imaging;
mod models;
mod overlay;
mod saving;

use std::sync::Mutex;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use overlay::RegionStore;

/// Last foreground window HWND, recorded by the shortcut handler before focusing Snapture.
pub(crate) static ACTIVE_WINDOW_TARGET: Mutex<Option<u32>> = Mutex::new(None);

/// Human-readable names of global shortcuts that failed to register (e.g.
/// already taken by another app). The frontend queries this once on startup
/// and warns the user — `eprintln!` alone is invisible in a windowed release
/// build, so failures would otherwise be silent dead hotkeys.
#[derive(Default)]
pub struct ShortcutFailures(pub Mutex<Vec<String>>);

#[tauri::command]
fn failed_shortcuts(state: tauri::State<'_, ShortcutFailures>) -> Vec<String> {
    state.0.lock().map(|v| v.clone()).unwrap_or_default()
}

/// The three quick-capture global shortcuts.
fn shortcuts() -> (Shortcut, Shortcut, Shortcut) {
    let mods = Modifiers::CONTROL | Modifiers::SHIFT;
    (
        Shortcut::new(Some(mods), Code::Digit1), // region
        Shortcut::new(Some(mods), Code::Digit2), // full screen
        Shortcut::new(Some(mods), Code::Digit3), // active window
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let (region_key, full_key, win) = shortcuts();
                    let kind = if shortcut == &region_key {
                        "region"
                    } else if shortcut == &full_key {
                        "fullscreen"
                    } else if shortcut == &win {
                        "window"
                    } else {
                        return;
                    };
                    // Record foreground window BEFORE focusing Snapture
                    if kind == "window" {
                        let _ = ACTIVE_WINDOW_TARGET
                            .lock()
                            .map(|mut t| *t = crate::capture::foreground_window_id());
                    }
                    if let Some(w) = app.get_webview_window("main") {
                        // Don't yank focus back to main if a region overlay is
                        // currently visible (mid-selection). Otherwise main would
                        // pop up underneath the overlay.
                        let overlay_active = app.webview_windows().iter().any(|(l, win)| {
                            l.starts_with("overlay-") && win.is_visible().unwrap_or(false)
                        });
                        if !overlay_active {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                        // Emit only to main, not to overlay windows (they don't
                        // listen for this and don't need the broadcast).
                        let _ = w.emit("capture-request", kind);
                    }
                })
                .build(),
        )
        .manage(RegionStore::default())
        .manage(ShortcutFailures::default())
        .on_window_event(|window, event| {
            // If an overlay window is closed directly (Alt+F4 instead of Esc),
            // treat it as a cancelled region capture: without this the main
            // window stays hidden forever and the frozen full-screen frames
            // (tens of MB per monitor) are never released.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label().starts_with("overlay-") {
                    api.prevent_close();
                    let _ = overlay::cancel_region_capture(window.app_handle().clone());
                } else if window.label() == "main" {
                    // Overlay windows are kept alive (hidden) for reuse, so
                    // they would keep the process running after the main
                    // window closes — exit explicitly instead.
                    window.app_handle().exit(0);
                }
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            imaging::clean_sessions(&handle);

            let (region_key, full_key, win_key) = shortcuts();
            let gs = handle.global_shortcut();
            let mut failures = Vec::new();
            for (name, key) in [
                ("Ctrl+Shift+1", region_key),
                ("Ctrl+Shift+2", full_key),
                ("Ctrl+Shift+3", win_key),
            ] {
                if let Err(e) = gs.register(key) {
                    eprintln!("shortcut register {name} failed: {e}");
                    failures.push(name.to_string());
                }
            }
            if let Ok(mut slot) = app.state::<ShortcutFailures>().0.lock() {
                *slot = failures;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture::list_monitors,
            capture::list_windows,
            capture::capture_monitor,
            capture::capture_all_monitors,
            capture::capture_window,
            capture::capture_active_window,
            overlay::begin_region_capture,
            overlay::region_payload,
            overlay::region_image_bytes,
            overlay::finish_region_capture,
            overlay::cancel_region_capture,
            clipboard::copy_bytes_to_clipboard,
            saving::save_image_bytes,
            imaging::read_image_data_url,
            history::history_list,
            history::history_delete,
            history::history_clear,
            failed_shortcuts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
