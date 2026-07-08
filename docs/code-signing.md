# Windows Code Signing (SignPath Foundation)

## Status: not yet applied

Snapture's Windows installers (`.exe`, `.msi`) are currently unsigned, so
Windows SmartScreen shows an "Unknown publisher" warning on first run. This
tracks the plan to fix that via [SignPath Foundation](https://signpath.org/),
which provides free code signing certificates to qualifying open-source
projects.

## Why Snapture qualifies

- Public repository, MIT license (OSI-approved)
- Already released (tagged versions on GitHub Releases)
- Built entirely by GitHub Actions on GitHub-hosted runners
  (`windows-latest` / `macos-latest` / `ubuntu-latest` — see
  `.github/workflows/release.yml`)
- No proprietary or non-open-source components

## Application steps (manual — requires a maintainer's own account)

1. Go to <https://signpath.io/> → **Open Source** → **Apply**, or
   <https://signpath.org/> for the Foundation's own program page.
2. Submit the application using the content below.
3. Wait for approval (SignPath Foundation reviews manually; historically
   takes anywhere from a few days to a couple of weeks).
4. Once approved, SignPath provides:
   - An **Organization ID** and **Project slug** in their dashboard
   - A **Signing Policy slug** you define per artifact type (e.g. release vs.
     test builds)
   - A **GitHub App** to install on this repository (grants them read access
     to verify builds originate from this repo's Actions runs)
   - An **API token** to add as a GitHub Actions secret
5. Come back to this file's "Next steps once approved" section below and
   wire the signing step into `.github/workflows/release.yml`.

## Application content (copy-paste ready)

**Project name:** Snapture

**Repository URL:** https://github.com/KoPyae2/screen-shoot-app

**License:** MIT

**Short description:**
A modern, open-source desktop screenshot studio (Tauri 2 + React 19) with
region/window/fullscreen capture, a full annotation editor (arrows, shapes,
blur/pixelate redaction, text), and multi-language support.

**Why do you need code signing:**
Our Windows installers are built and distributed via GitHub Releases but are
unsigned, so Microsoft Defender SmartScreen blocks first-time installs with
an "Unknown publisher" warning, which is a significant trust/adoption barrier
for a free open-source tool with no ability to purchase commercial signing.

**Build system / CI:** GitHub Actions, using `tauri-apps/tauri-action`,
triggered on version tags (`v*`). All matrix jobs (Windows, macOS, Linux) run
on GitHub-hosted runners — no self-hosted or third-party build infrastructure.

**Artifacts to sign:** Windows NSIS installer (`Snapture_x.y.z_x64-setup.exe`)
and MSI (`Snapture_x.y.z_x64_en-US.msi`), produced by `tauri build` in
`.github/workflows/release.yml`.

**Maintainer contact:** _(fill in your email/GitHub handle when submitting)_

**Application identifier:** `com.chico.screen-shoot`

## Next steps once approved

1. Add these repository secrets (Settings → Secrets and variables → Actions):
   - `SIGNPATH_API_TOKEN`
   - `SIGNPATH_ORGANIZATION_ID`
   - `SIGNPATH_PROJECT_SLUG`
   - `SIGNPATH_SIGNING_POLICY_SLUG`
2. Install the SignPath GitHub App on `KoPyae2/screen-shoot-app` (link
   provided in their onboarding email).
3. Update `.github/workflows/release.yml` to, for the `windows-latest` job:
   - Build unsigned as today, then `actions/upload-artifact` the `.exe`/`.msi`
   - Submit them via `signpath/github-action-submit-signing-request@v2` with
     the secrets above
   - Download the signed artifacts back and attach those (instead of the
     unsigned ones) to the GitHub Release
4. Add a `.signpath/` policy file if SignPath's onboarding requires one
   (exact schema is provided in their dashboard after approval — do not
   guess at this before then).
5. Verify: install the signed `.exe` on a clean Windows machine/VM and
   confirm SmartScreen either shows the verified publisher name or no
   longer blocks the run outright. Note that reputation for a *new*
   certificate can still take some downloads to fully clear SmartScreen's
   heuristics — this is expected and improves over time.
