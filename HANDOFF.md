# MediaGrabber `v2.0-pre8` (Nightly Pre-Release) — Release Handoff

## Summary
`v2.0-pre8` is a nightly feature pre-release on the `2.0-app` branch adding **full Windows 10 & Windows 11 support** alongside Linux, plus **dynamic OS platform tags** appended to the version string (`v2.0-pre8-Linux`, `v2.0-pre8-Windows11`, `v2.0-pre8-Windows10`).

---

## What Changed in `v2.0-pre8`

### 1. Windows 10 & Windows 11 Support
- Added [`grab.ps1`](./grab.ps1): native PowerShell download wrapper mirroring Linux [`grab`](./grab) for YouTube, YouTube Music, Spotify, and Gallery pipelines with `.info.json` routing, thumbnails, and archive tracking.
- Added [`deploy/install-windows.ps1`](./deploy/install-windows.ps1) and [`deploy/start-windows.bat`](./deploy/start-windows.bat) with automatic Windows 10 vs Windows 11 detection, `winget` dependency checks, and optional startup Scheduled Task registration.
- Updated `server.ts` across PATH resolution (`path.delimiter` + `.exe`/`.cmd`/`.bat` + WinGet/Chocolatey/Scoop/Python paths), `%LOCALAPPDATA%\MediaGrabber` state directory, `Videos`/`Music`/`Pictures` library defaults, case-insensitive path safety checks, `taskkill` job cancellation, PowerShell zip extract/compress fallbacks, and cross-platform System Info.

### 2. Dynamic OS Tag in Version Number
- `CURRENT_APP_VERSION` now automatically resolves to:
  - `v2.0-pre8-Linux` on Linux hosts
  - `v2.0-pre8-Windows11` on Windows 11 (`Build >= 22000`)
  - `v2.0-pre8-Windows10` on Windows 10 (`Build < 22000`)
- Updated `parseVer` & `isNightlyReleaseTag` in `server.ts` and `ChangelogModal.tsx` to normalize trailing OS tags when comparing upstream GitHub tags (`v2.0-pre8`, `v2.0-pre9`, etc.).
- Displayed in the **TopBar**, **Sidebar**, **`/healthz`**, **`/api/version/info`**, and **Utilities → Server Manager**.

---

## GitHub Repository & Release Alignment Notes
- Default branch target: **`2.0-app`**
- All `v2.0-pre*` releases (`v2.0-pre2`, `V2.0-pre3`, `v2.0-pre3fix`, `v2.0-pre4`, `v2.0-pre5`, `v2.0-pre6`, `v2.0-pre7`, `v2.0-pre7-fix4`, `v2.0-pre8`) should be marked as GitHub **Pre-releases** (`--prerelease`) so stable channel users only see full releases while nightly channel users receive all pre-releases and `2.0-app` updates.
- Companion Jellyfin Plugin repository: **`https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`** (root contents live inside `jellyfin-plugin/`).
