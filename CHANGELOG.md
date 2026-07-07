# Changelog

All notable changes to Snapture are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-07-07

### Added
- Redesigned annotation editor toolbars: floating glassy rails with grouped sections, keyboard shortcuts shown as chips in tooltips, larger color swatches with animated selection, and a recessed slider with live value readout.
- Redesigned "Clear all screenshots?" confirmation dialog with a clear destructive action, capture count, and safe-default focus (new reusable `ConfirmDialog` component).
- Startup warning toast when a global hotkey can't be registered (e.g. taken by another app) — previously failures were silent.
- CI workflow (typecheck, frontend build, `cargo fmt`/`clippy`), LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY policy, issue/PR templates.

### Changed
- Chinese locale code corrected from `ch` to `zh` so browser language detection works; existing manual selections are migrated automatically.
- The Inter font is now bundled with the app instead of loaded from Google Fonts — works offline and inside the packaged app's CSP.
- Captures are PNG-encoded once instead of twice, and saving as PNG no longer re-encodes — large-screen captures and saves are noticeably faster.

### Fixed
- Hotkey hints were swapped (fullscreen/region) in the Chinese, Spanish, Hindi, and Burmese locales.
- The app could be left permanently invisible if a capture or the region overlay failed after hiding the main window, or if an overlay window was closed with Alt+F4.
- Fullscreen/window captures could include Snapture's own window mid-hide.
- Screenshot history could be silently wiped by a corrupt index; writes are now atomic, serialized, and corrupt indexes are backed up.
- Closing the main window left the process running in the background.
- Editor: cancelled empty text boxes and zero-drag shapes no longer leave invisible artifacts or pollute undo history; undo cap off-by-one fixed.
- The contextual slider label ("Strength"/"Size"/"Font") was clipped in the editor's right toolbar; it now renders vertically and displays in full in every language.

### Security
- The image-read IPC command is confined to the app's own capture directories (was an arbitrary-file-read primitive for the webview).
- File saving no longer lets the webview choose arbitrary filesystem paths.
- Removed unused Tauri capability grants (webview window creation, clipboard write, global shortcuts, opener).

## [1.1.0] - 2026-07-07

### Added
- Brush preview and a taller size slider in the annotation editor.
- Multi-platform release workflow (Windows, macOS, Linux) via GitHub Actions.

### Fixed
- Active-window capture now captures the correct window instead of Snapture itself.
- Transparent overlay windows on macOS (enabled `macos-private-api`).
- Global shortcut registration errors are now handled gracefully.
- Swapped `Ctrl+Shift+1` / `Ctrl+Shift+2` shortcuts to match documented behavior (full screen / region).

## [1.0.0] - 2026-07-02

### Added
- Initial release: full screen, region, window, and all-displays capture modes.
- Annotation editor with arrows, shapes, freehand pen, highlighter, blur/pixelate redaction, and text overlays.
- Auto-copy to clipboard, capture history sidebar, native save dialog (PNG/JPEG).
- Global hotkeys, dark/light/system theme, custom title bar.
- Localization: English, Chinese, Spanish, Hindi, and Burmese.

[Unreleased]: https://github.com/KoPyae2/screen-shoot-app/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/KoPyae2/screen-shoot-app/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/KoPyae2/screen-shoot-app/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/KoPyae2/screen-shoot-app/releases/tag/v1.0.0
