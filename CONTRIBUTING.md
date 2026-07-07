# Contributing to Snapture

Thanks for your interest in contributing! This document explains how to get set up, the conventions we follow, and how to submit changes.

## Getting Set Up

1. Install the prerequisites listed in the [README](README.md#prerequisites) (Node.js ≥ 18, Rust stable, and the Tauri 2 platform dependencies).
2. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/screen-shoot-app.git
   cd screen-shoot-app
   npm install
   ```

3. Run the app in development mode:

   ```bash
   npm run dev:tauri
   ```

## Project Layout

| Path | Purpose |
|---|---|
| `src/` | React frontend (TypeScript) |
| `src/components/` | UI components (capture toolbar, editor, history, shared UI) |
| `src/store/` | Zustand stores (capture, editor, history, theme) |
| `src/lib/` | Tauri command wrappers, events, export helpers, shared types |
| `src/i18n/` | i18next setup and locale files |
| `src-tauri/src/` | Rust backend (capture, clipboard, imaging, overlay, saving) |
| `overlay.html` + `src/overlay-main.tsx` | Region-selection overlay window |

## Before You Submit

Run these locally — CI enforces all of them:

```bash
npm run typecheck            # TypeScript
npm run build                # Frontend build

cd src-tauri
cargo fmt --check            # Rust formatting
cargo clippy --all-targets -- -D warnings
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Use clear commit messages. We loosely follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, …).
- If your change affects the UI, include a screenshot or short recording.
- If you add user-facing strings, add them to **all** locale files in `src/i18n/locales/` (English values are fine as placeholders for languages you don't speak — note it in the PR).
- Update documentation when behavior changes.

## Adding a Translation

1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/<lang-code>.json`.
2. Translate the values (keep the keys unchanged).
3. Import and register it in `src/i18n/i18n.ts`.
4. Add the language entry to the `LANGUAGES` array in `src/components/ui/Header.tsx`.

## Reporting Bugs

Open an issue using the bug report template. Please include:

- Your OS and version
- Snapture version
- Steps to reproduce
- What you expected vs. what happened

## Questions?

Open a [discussion](https://github.com/KoPyae2/screen-shoot-app/discussions) or an issue — we're happy to help.
