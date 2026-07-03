mod capture;
mod clipboard;
mod history;
mod imaging;
mod models;
mod overlay;
mod saving;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use overlay::RegionStore;

/// The three quick-capture global shortcuts.
fn shortcuts() -> (Shortcut, Shortcut, Shortcut) {
    let mods = Modifiers::CONTROL | Modifiers::SHIFT;
    (
        Shortcut::new(Some(mods), Code::Digit1), // full screen
        Shortcut::new(Some(mods), Code::Digit2), // region
        Shortcut::new(Some(mods), Code::Digit3), // active window
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    let (full, region, win) = shortcuts();
                    let kind = if shortcut == &full {
                        "fullscreen"
                    } else if shortcut == &region {
                        "region"
                    } else if shortcut == &win {
                        "window"
                    } else {
                        return;
                    };
                    if let Some(w) = app.get_webview_window("main") {
                        // Don't yank focus back to main if a region overlay is
                        // currently visible (mid-selection). Otherwise main would
                        // pop up underneath the overlay.
                        let overlay_active = app
                            .webview_windows()
                            .iter()
                            .any(|(l, win)| {
                                l.starts_with("overlay-")
                                    && win.is_visible().unwrap_or(false)
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
        .setup(|app| {
            let handle = app.handle().clone();
            imaging::clean_sessions(&handle);

            let (full, region, win) = shortcuts();
            let gs = app.global_shortcut();
            let _ = gs.register(full);
            let _ = gs.register(region);
            let _ = gs.register(win);
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
            clipboard::copy_image_to_clipboard,
            clipboard::copy_bytes_to_clipboard,
            saving::save_image_bytes,
            imaging::read_image_data_url,
            history::history_list,
            history::history_delete,
            history::history_clear,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
