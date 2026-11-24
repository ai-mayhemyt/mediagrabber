# MediaGrabber `v2.0` (Full Release) — Release Handoff

## Summary
`v2.0` is the full stable release of MediaGrabber across **Linux**, **Windows 11**, and **Windows 10**, migrating the repository branch layout from `2.0-app` to **`mediagrabber`** (default/stable) and **`mediagrabber-nightly`** (nightly pre-releases), with dynamic OS platform tags appended to the reported version (`v2.0-Linux`, `v2.0-Windows11`, `v2.0-Windows10`).

---

## What Changed in `v2.0`

### 1. Branch & Release Channel Alignment (`mediagrabber` + `mediagrabber-nightly`)
- Renamed the primary branch from `2.0-app` to **`mediagrabber`** as the repository default branch.
- Created **`mediagrabber-nightly`** for ongoing pre-releases and nightly builds.
- Updated `server.ts` (version updater & git pull candidates), `deploy/install-linux.sh`, `deploy/install-windows.ps1`, `README.md`, and `jellyfin-plugin/README.md` to track **`mediagrabber`** for stable installs and **`mediagrabber-nightly`** for nightly updates (keeping `2.0-app` as a fallback for legacy `v2.0-pre*` installs).

### 2. Cross-Platform Ingestion & Installers (`Linux`, `Windows 11`, `Windows 10`)
- Native CLI wrappers [`grab`](./grab) (Linux) and [`grab.ps1`](./grab.ps1) (Windows PowerShell) supporting **YouTube**, **YouTube Music**, **Spotify**, **Instagram**, **TikTok**, and `yt-dlp` / `gallery-dl` pipelines with `.info.json` routing, thumbnails, and `archive.txt` deduplication.
- Automated deployment via [`deploy/install-linux.sh`](./deploy/install-linux.sh) (`systemd` + `--stable` / `--nightly`) and [`deploy/install-windows.ps1`](./deploy/install-windows.ps1) + [`deploy/start-windows.bat`](./deploy/start-windows.bat) (`winget` dependency checks + optional logon Scheduled Task).
- Dynamic OS version suffixes (`-Linux`, `-Windows11`, `-Windows10`) displayed in the TopBar, Sidebar, `/healthz`, `/api/version/info`, and **Utilities → Server Manager**.

### 3. Core Console & Jellyfin Companion Features
- **Queue & Batch Console**: Multi-URL paste/file import, live streaming logs, retry/cancel, scheduled downloads, stale-job auto-cleanup, in-browser HTTP range playback, and signed 1-hour QR/Send-to-Device links.
- **Library & Utilities**: Metadata & cover art editor, SHA-256 duplicate scanner, library reorganizer, archive browser, YouTube RSS channel feeds, Navidrome radio manager, and multi-user + 2FA + scoped `mg_...` API tokens.
- **Notifications & Integrations**: Jellyfin, Plex, and Navidrome library refreshes, Web Push (VAPID) notifications, outgoing Discord/Slack/ntfy webhooks, and the **MediaGrabber — Jellyfin Edition** plugin (`jellyfin-plugin/`).

---

## GitHub Repository & Release Alignment Notes
- Repository: **`https://github.com/ai-mayhemyt/mediagrabber`**
- Default / Stable branch: **`mediagrabber`**
- Nightly / Pre-release branch: **`mediagrabber-nightly`**
- Publish **`v2.0`** as a **Full Release** (not marked `--prerelease`) so both **Full Releases (`--stable`)** and **Nightly** users can upgrade cleanly; keep `v2.0-pre2` through `v2.0-pre8` marked as GitHub **Pre-releases**.
- Companion Jellyfin Plugin repository: **`https://github.com/ai-mayhemyt/MediaGrabber-Jellyfin-Edition`** (root contents live inside `jellyfin-plugin/`).
