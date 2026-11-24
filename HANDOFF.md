# MediaGrabber `v2.1-pre2` (Nightly Pre-Release) — Release Handoff

## Summary
`v2.1-pre2` builds on `v2.1-pre1` on the **`mediagrabber-nightly`** branch, adding **Live SSE Log Streaming**, **Automated Scheduled SHA-256 Duplicate Cleanup**, **Custom Per-Site Naming Templates**, and **Bandwidth Throttling (`--limit-rate`)** across **both Windows 10/11 and Linux**.

---

## What Changed in `v2.1-pre2`

### 1. Live SSE Log Streaming (`Windows + Linux`)
- Added `GET /api/log/:jobId/stream` (Server-Sent Events) backed by per-job event subscribers (`jobLogSubscribers`) inside `server.ts`, emitting initial backlog (`init`), live line appends (`line`), status/progress transitions (`status`), and 15-second keepalives with automatic cleanup on completion or disconnect.
- Upgraded `JobLogModal` in `src/components/Modals.tsx` to subscribe via `EventSource` with a `LIVE STREAM` pulse indicator, terminal status display, and an **Auto-scroll** toggle.

### 2. Automated Duplicate Cleanup Scheduler (`Windows + Linux`)
- Refactored SHA-256 hashing into chunked 1 MB streaming reads (`hashFileSha256`) and extracted reusable `deduplicateDirectory()` excluding `TRASH_DIR` and `TMP_DIR`.
- Added configurable **Automated Duplicate Cleanup** schedule (`off`, `daily`, `weekly`) in **Settings → Webhooks, Stale Jobs & Scheduled Duplicate Cleanup** plus `POST /api/deduplicate/run-scheduled` (**Run All Libraries Now**) and background 30-minute timer checks, moving exact byte duplicates to `duplicates_trash` while keeping the largest file.

### 3. Custom Per-Site Naming Templates (`Windows + Linux`)
- Added validated per-site template settings (`yt_naming_template`, `music_naming_template`, `gallery_naming_template`) in **Settings → Folder Structure, Paths & Naming Templates** with a **Reset Defaults** action.
- Wired `GRAB_YT_TEMPLATE`, `GRAB_MUSIC_TEMPLATE`, `GRAB_GALLERY_TEMPLATE`, and `GRAB_FOLDER_STRUCTURE` across Linux [`grab`](./grab), Windows [`grab.ps1`](./grab.ps1), and the direct fallback pipeline in `server.ts`, including recursive temp file discovery so both filename-only templates and subfolder templates resolve cleanly.
- Enforced server-side template validation blocking `..` path traversal, leading root/drive prefixes, control characters, and shell metacharacters.

### 4. Bandwidth Throttling (`--limit-rate`) (`Windows + Linux`)
- Added **Bandwidth Limit (`--limit-rate`)** quick presets (`Unlimited`, `1M`, `2M`, `5M`, `10M`, `25M`, `50M`) and a custom rate override field in **Settings → Video & Audio Output** validated against `^\d+(?:\.\d+)?[KMGkmg]?$`.
- Wired `GRAB_RATE_LIMIT` into `yt-dlp` and `gallery-dl` across Linux `grab`, Windows `grab.ps1`, and `server.ts` fallback downloads.

---

## GitHub Repository & Release Alignment Notes
- Repository: **`https://github.com/ai-mayhemyt/mediagrabber`**
- Stable / Default branch: **`mediagrabber`**
- Nightly / Pre-release branch: **`mediagrabber-nightly`** (target for `v2.1-pre2`)
- Mark `v2.1-pre2` as a GitHub **Pre-release** (`--prerelease`); when finalized, merge `mediagrabber-nightly` → `mediagrabber` and publish the full release without `--prerelease`.
- Companion Jellyfin Plugin repository: **`https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`** (root contents live inside `jellyfin-plugin/`).
