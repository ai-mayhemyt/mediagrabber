# MediaGrabber `v2.1-pre1` (Nightly Pre-Release) — Release Handoff

## Summary
`v2.1-pre1` is the first nightly feature pre-release on **`mediagrabber-nightly`** following `v2.0`, supporting **both Windows 10/11 and Linux** across all six new features plus branch-aligned auto-updating (`mediagrabber` for Full Releases, `mediagrabber-nightly` for Nightly Pre-Releases).

---

## What Changed in `v2.1-pre1`

### 1. Standalone Windows (`.exe`) & Linux Binary Support
- Added `build:server` (`esbuild` CJS production bundle excluding dev-only `vite`), `build:exe` (`mediagrabber-win-x64.exe`), `build:bin:linux` (`mediagrabber-linux-x64`), and `build:binaries` in `package.json`.
- Updated `server.ts` for packaged binary execution: resolves `dist/` from `APP_ROOT` or embedded `BUNDLE_ROOT`, materializes bundled `grab` / `grab.ps1` into `STATE_DIR` on real disk for `bash` / PowerShell execution, supports `--open` (launch browser), `--data-dir`, `--port`, and `--version`.
- Updated `deploy/install-windows.ps1` to build and register `mediagrabber.exe` directly in Windows Task Scheduler instead of `start-windows.bat`, and added `.github/workflows/build-binaries.yml` to build and attach Windows + Linux binaries & zips automatically on tag push.

### 2. Persistent Queue & Concurrency Scheduler (`Windows + Linux`)
- Added `queue.json` persistence inside `STATE_DIR` (`%LOCALAPPDATA%\MediaGrabber\.mediagrabber` on Windows, `/var/lib/mediagrabber/.mediagrabber` on Linux); interrupted `running` jobs are automatically re-queued on server restart.
- Added `scheduleQueueWorker()` enforcing **Max Concurrent Downloads** (`1–8`, default `2`) FIFO across batches and retries, exposed in **Settings → Video & Audio Output**.

### 3. In-UI `cookies.txt` Upload & Paste (`Windows + Linux`)
- Added admin-protected endpoints `GET /api/settings/cookies/status`, `POST /api/settings/cookies`, and `DELETE /api/settings/cookies/:kind` storing validated Netscape `cookies.txt` files inside `STATE_DIR` (`0600` on POSIX) without exposing raw cookie contents.
- Added Upload `.txt`, Paste Text, live cookie status badges, and Clear controls for both YouTube and Gallery in **Settings → Cookies, SMTP & Extractor Arguments**.

### 4. YouTube RSS Auto-Grab (`Windows + Linux`)
- Added per-channel **Auto-Grab** toggle (`Auto` / `Manual` + `MP4` / `MP3` mode selector) and **Poll Now** trigger in the Sidebar **YouTube Feeds** panel.
- Added 15-minute background RSS polling in `server.ts` (`POST /api/feeds/youtube/:channelId/auto`, `POST /api/feeds/youtube/poll`) deduplicated against `archive.txt`, active queue, and download history, only grabbing new uploads published after Auto-Grab is enabled.

### 5. Per-Grab Options: Subtitles, SponsorBlock & Playlist Toggle (`Windows + Linux`)
- Added **Embed Subtitles**, **SponsorBlock**, and **Single Video / Full Playlist** toggles directly on the Queue submit card and displayed active option tags on queued/running/completed job cards.
- Wired `GRAB_EMBED_SUBS`, `GRAB_SPONSORBLOCK`, and `GRAB_PLAYLIST` across `server.ts`, Linux [`grab`](./grab), Windows [`grab.ps1`](./grab.ps1), and the direct `yt-dlp` fallback pipeline.

### 6. Pre-Flight Dependency Health Check & 1-Click Tool Updater (`Windows + Linux`)
- Added `GET /api/server/dependencies` and `POST /api/server/dependencies/update` (admin-protected) probing installed paths and live versions of `yt-dlp`, `FFmpeg`, `spotdl`, `gallery-dl`, `Deno`, and `grab`/`grab.ps1`, plus cross-platform 1-click updates (`yt-dlp -U`, `pip`, and `winget` on Windows).
- Added the **Pre-Flight Dependency Health** card in **Utilities → Server Manager** with live status, OS install hints, and **Update yt-dlp** / **Update All Extractors** buttons.

### 7. Auto-Updater Branch Alignment (`mediagrabber` vs `mediagrabber-nightly`)
- Fixed `/api/version/info`, `/api/version/update`, `UtilitiesView.tsx`, and `deploy/install-linux.sh` so Nightly always tracks/pulls **`mediagrabber-nightly`** and Full Releases always track **`mediagrabber`**, removing obsolete `2.0-app` branch links and fallbacks.

---

## GitHub Repository & Release Alignment Notes
- Repository: **`https://github.com/ai-mayhemyt/mediagrabber`**
- Stable / Default branch: **`mediagrabber`**
- Nightly / Pre-release branch: **`mediagrabber-nightly`** (target for `v2.1-pre1`)
- Mark `v2.1-pre1` as a GitHub **Pre-release** (`--prerelease`); when finalized, merge `mediagrabber-nightly` → `mediagrabber` and publish the full release without `--prerelease`.
- Companion Jellyfin Plugin repository: **`https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`** (root contents live inside `jellyfin-plugin/`).
