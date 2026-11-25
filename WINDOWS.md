<div align="center">

<img src="public/logo.png" alt="MediaGrabber" width="320" />

# MediaGrabber `v2.1` — Windows 10 & Windows 11 Guide

Complete setup, standalone `.exe` binary, mandatory extractors (`yt-dlp`, `spotdl`, `gallery-dl`, `ffmpeg`), npm CLI, `grab.ps1`, startup task, and troubleshooting guide for **Windows 11** (`-Windows11`) and **Windows 10** (`-Windows10`).

</div>

---

## Option 1: Automated PowerShell Installer (`deploy/install-windows.ps1` — Recommended)

Open **PowerShell** (run as Administrator if registering a Windows logon Scheduled Task):

```powershell
git clone -b mediagrabber https://github.com/ai-mayhemyt/mediagrabber.git C:\MediaGrabber
cd C:\MediaGrabber
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\install-windows.ps1 -Channel stable -RegisterStartupTask
```

What `install-windows.ps1` does automatically:
- Detects **Windows 11 (`Build >= 22000`)** vs **Windows 10 (`Build < 22000`)** for the version badge.
- Safely installs core tools via WinGet: `OpenJS.NodeJS.LTS`, `Git.Git`, `Gyan.FFmpeg`, and `Python.Python.3.12` (bypassing Windows Store `WindowsApps` python stubs).
- **Mandatorily installs & verifies all downloaders**: runs `python -m pip install --upgrade pip yt-dlp spotdl gallery-dl`, registers Python `Scripts` permanently on User `PATH`, and verifies `ffmpeg`, `yt-dlp`, `spotdl`, and `gallery-dl` resolve cleanly.
- Writes `.env` in **UTF-8 without BOM** (`NODE_ENV=production`, `PORT=3000`, `MEDIAGRABBER_DATA_DIR=%LOCALAPPDATA%\MediaGrabber`, `MEDIAGRABBER_UPDATE_CHANNEL=stable`).
- Builds `dist/` + `dist-server/server.cjs` and compiles standalone **`mediagrabber.exe`** via `@yao-pkg/pkg`.
- With `-RegisterStartupTask`, creates the **`MediaGrabber`** Scheduled Task to start automatically at Windows logon.

Launch MediaGrabber anytime:

```powershell
.\mediagrabber.exe --open
# Or using the Node launcher:
.\deploy\start-windows.bat --open
```

When you first open **`http://127.0.0.1:3000`**, MediaGrabber launches cleanly with **no pre-saved accounts** and opens the **Setup Wizard** so you can create your own Administrator account and customize library paths.

---

## Option 2: Standalone Executable (`mediagrabber-win-x64.exe`)

No Node.js installation is required to run the prebuilt Windows executable:

1. Download **`mediagrabber-win-x64.exe`** from [GitHub Releases (`v2.1`)](https://github.com/ai-mayhemyt/mediagrabber/releases).
2. Place it in a folder such as `C:\MediaGrabber\mediagrabber.exe`.
3. Install **mandatory** FFmpeg & extractors (via **WinGet** + Python):
   ```powershell
   winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
   winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
   python -m pip install --upgrade pip yt-dlp spotdl gallery-dl
   ```
4. Launch MediaGrabber and open your browser automatically:
   ```cmd
   mediagrabber.exe --open
   ```
   Or specify a custom port and workspace directory:
   ```cmd
   mediagrabber.exe --port 3000 --data-dir "%LOCALAPPDATA%\MediaGrabber" --open
   ```

> MediaGrabber automatically materializes [`grab.ps1`](./grab.ps1), scans WinGet FFmpeg + Python `Scripts` directories dynamically, and supports 1-click self-updates in **Utilities → Server Manager**.

---

## Option 3: Global npm Package (`npm install -g mediagrabber`)

Ensure `ffmpeg`, `yt-dlp`, `spotdl`, and `gallery-dl` are installed (see Option 2 step 3), then:

```powershell
npm install -g mediagrabber
mediagrabber --open
```

Check version or customize port/data directory:

```powershell
mediagrabber --version
mediagrabber --port 3000 --data-dir "%LOCALAPPDATA%\MediaGrabber" --open
```

---

## Updating an Existing `C:\MediaGrabber` Install

```powershell
cd C:\MediaGrabber
git fetch --all --tags
git checkout mediagrabber
git pull
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\install-windows.ps1 -Channel stable
```

Existing accounts, settings, queue, and history inside `%LOCALAPPDATA%\MediaGrabber` are always preserved on upgrade.

---

## Standalone PowerShell Wrapper (`grab.ps1`)

You can run downloads directly from PowerShell using [`grab.ps1`](./grab.ps1):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\grab.ps1 "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
powershell -NoProfile -ExecutionPolicy Bypass -File .\grab.ps1 -AudioOnly "https://open.spotify.com/track/..."
```

Environment variables supported by `grab.ps1` (also managed automatically by the Web UI):
- `GRAB_EMBED_SUBS=true` — Embed English subtitles
- `GRAB_SPONSORBLOCK=true` — Remove SponsorBlock segments
- `GRAB_PLAYLIST=true` — Download full playlist (`false` = single item)
- `GRAB_RATE_LIMIT=5M` — Limit download rate via `--limit-rate`
- `GRAB_YT_TEMPLATE`, `GRAB_MUSIC_TEMPLATE`, `GRAB_GALLERY_TEMPLATE` — Custom per-site naming templates
- `GRAB_COOKIES_YOUTUBE`, `GRAB_COOKIES_GALLERY` — Paths to Netscape `cookies.txt` files

---

## Default Windows Data & Media Directories

| Purpose | Default Location |
| --- | --- |
| App State, Queue, History, Settings, Logs | `%LOCALAPPDATA%\MediaGrabber\.mediagrabber` |
| YouTube / Video Downloads | `%USERPROFILE%\Videos\MediaGrabber` |
| Spotify / YT Music Downloads | `%USERPROFILE%\Music\MediaGrabber` |
| Instagram / TikTok / Gallery Downloads | `%USERPROFILE%\Pictures\MediaGrabber` |

All media library base paths and per-site naming templates can be customized anytime in **Settings**.

---

## Keyboard Shortcuts in the Web UI

Press **`?`** anywhere inside MediaGrabber to open the interactive Keyboard Shortcuts modal:
- **`/`** or **`Ctrl + K`** — Focus Global Search bar
- **`N`** — Jump to Queue & focus the URL batch box
- **`Ctrl + Enter`** *(in URL box)* — Submit batch grab immediately
- **`1`** / **`2`** / **`3`** / **`4`** — Switch between Queue, History, Utilities, and Settings
- **`R`** — Refresh Queue, History, and Storage metrics
- **`?`** — Open Keyboard Shortcuts reference
- **`Esc`** — Close topmost modal

---

## Building Windows `.exe` Locally

```powershell
npm install --no-package-lock --legacy-peer-deps
npm run build:exe
```

Output binary: `dist-exe\mediagrabber-win-x64.exe`
